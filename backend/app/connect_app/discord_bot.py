import discord
import asyncio
from typing import Optional
import os
import json
from sqlalchemy.orm import Session
from app.utils.logger import logger
from app.database.postgres import get_db
from app.database.models import WebhookIntegration, UserSettings
from app.services.translation import TranslationService

class DiscordService:
    def __init__(self):
        self.client = None
        self.token = os.getenv("DISCORD_BOT_TOKEN")
        self.is_running = False
        self.translation_service = TranslationService()
    
    async def initialize_bot(self):
        """Initialize Discord bot client"""
        if not self.client:
            intents = discord.Intents.default()
            intents.message_content = True
            self.client = discord.Client(intents=intents)
            
            @self.client.event
            async def on_ready():
                logger.info(f'Discord bot logged in as {self.client.user}')
                self.is_running = True
            
            @self.client.event
            async def on_message(message):
                logger.info(f'Received message from \n {message}')
                if message.author == self.client.user:
                    return
                
                # Send message to FastAPI webhook
                await self.process_message({
                    'content': message.content,
                    'author_id': str(message.author.id),
                    'channel_id': str(message.channel.id),
                    'guild_id': str(message.guild.id) if message.guild else None
                })

    async def start_bot(self):
        """Start Discord bot"""
        if not self.client:
            await self.initialize_bot()
        
        if self.token and not self.is_running:
            await self.client.start(self.token)
    
    async def send_message(self, channel_id: str, message: str):
        """Send message to Discord channel"""
        if self.client and self.is_running:
            try:
                channel = self.client.get_channel(int(channel_id))
                if channel:
                    await channel.send(message)
                    logger.info(f"Message sent to Discord channel {channel_id}")
            except Exception as e:
                logger.error(f"Error sending message to Discord: {str(e)}")

    def parse_translate_command(self, content: str) -> tuple:
        """
        Parse !translate command
        Pattern: !translate src_lang target_lang text
        Returns: (src_lang, target_lang, text) or (None, None, None) if invalid
        """
        if not content.startswith('!translate '):
            return None, None, None
        
        # Remove the command prefix
        command_content = content[11:]  # len('!translate ') = 11
        
        # Split into parts
        parts = command_content.split(' ', 2)  # Split into maximum 3 parts
        
        if len(parts) < 3:
            return None, None, None
        
        src_lang, target_lang, text = parts
        
        # Basic validation
        if not src_lang or not target_lang or not text.strip():
            return None, None, None
        
        return src_lang.strip(), target_lang.strip(), text.strip()

    async def handle_help_command(self, channel_id: str):
        """Handle !help command"""
        help_message = """
🤖 **Translation Bot Commands:**

**Manual Translation:**
`!translate <source_lang> <target_lang> <text>`
Example: `!translate en vi Hello world`

**Supported Language Codes:**
• `en` - English
• `vi` - Vietnamese  
• `fr` - French
• `es` - Spanish
• `de` - German
• `ja` - Japanese
• `ko` - Korean
• `zh` - Chinese
• `auto` - Auto-detect source language

**Auto Translation:**
Messages are automatically translated based on your user settings if webhook integration is configured.

**Need help?** Contact your administrator to set up webhook integration for this channel.
        """
        await self.send_message(channel_id, help_message.strip())

    async def process_message(self, data: dict):
        """Process Discord message and translate if needed"""
        try:
            channel_id = data.get('channel_id')
            content = data.get('content', '')
            
            # Skip empty messages
            if not content.strip():
                return
            
            # Handle help command
            if content.strip().lower() in ['!help', '!translate help', '!translate']:
                await self.handle_help_command(channel_id)
                return
            
            # Check if it's a translate command
            src_lang, target_lang, text_to_translate = self.parse_translate_command(content)
            
            if src_lang and target_lang and text_to_translate:
                # Handle translate command
                await self.handle_translate_command(channel_id, src_lang, target_lang, text_to_translate, data)
            else:
                # Handle regular message (auto-translate based on user settings)
                await self.handle_auto_translate(channel_id, content, data)
                
        except Exception as e:
            logger.error(f"Error processing Discord message: {str(e)}")
            # Send error message to Discord
            try:
                await self.send_message(data.get('channel_id'), "Sorry, there was an error processing your message.")
            except:
                pass

    async def handle_translate_command(self, channel_id: str, src_lang: str, target_lang: str, text: str, data: dict):
        """Handle !translate command"""
        try:
            # Get database session
            db: Session = next(get_db())
            
            try:
                # Find webhook integration by channel_id in meta_data
                webhook_integration = db.query(WebhookIntegration).filter(
                    WebhookIntegration.platform == 'discord'
                ).all()
                
                user_id = None
                for integration in webhook_integration:
                    if integration.meta_data and isinstance(integration.meta_data, dict):
                        # Check if channel_id matches in meta_data
                        if integration.meta_data.get('channel_id') == channel_id:
                            user_id = integration.user_id
                            break
                
                # Validate language codes
                supported_languages = self.translation_service.get_supported_languages()
                
                if src_lang.lower() != 'auto' and src_lang not in supported_languages:
                    await self.send_message(channel_id, f"❌ Invalid source language code: `{src_lang}`. Use `!help` to see supported languages.")
                    return
                
                if target_lang not in supported_languages:
                    await self.send_message(channel_id, f"❌ Invalid target language code: `{target_lang}`. Use `!help` to see supported languages.")
                    return
                
                # Handle language detection for 'auto'
                if src_lang.lower() == 'auto':
                    detection_result = self.translation_service.detect_language(text)
                    src_lang = detection_result.detected_language
                
                # Skip translation if source and target are the same
                if src_lang == target_lang:
                    await self.send_message(channel_id, f"⚠️ Source and target languages are the same ({src_lang}). No translation needed.")
                    return
                
                # Translate the text
                logger.info(f"Command translation: {src_lang} → {target_lang}")
                translation_result = await self.translation_service.translate_text(
                    text=text,
                    source_lang=src_lang,
                    target_lang=target_lang,
                    user_id=user_id,
                    db=db
                )
                
                # Send translated message back to Discord channel
                translated_message = f"🔄 **Translation ({src_lang} → {target_lang}):**\n```{translation_result.translated_text}```"
                await self.send_message(channel_id, translated_message)
                
                logger.info(f"Command translation sent to Discord channel {channel_id}")
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error handling translate command: {str(e)}")
            await self.send_message(channel_id, f"❌ Translation failed: {str(e)}")

    async def handle_auto_translate(self, channel_id: str, content: str, data: dict):
        """Handle automatic translation based on user settings"""
        try:
            # Get database session
            db: Session = next(get_db())
            
            try:
                # Find webhook integration by channel_id in meta_data
                webhook_integration = db.query(WebhookIntegration).filter(
                    WebhookIntegration.platform == 'discord'
                ).all()
                
                user_id = None
                for integration in webhook_integration:
                    if integration.meta_data and isinstance(integration.meta_data, dict):
                        # Check if channel_id matches in meta_data
                        if integration.meta_data.get('channel_id') == channel_id:
                            user_id = integration.user_id
                            break
                
                if not user_id:
                    logger.info(f"No webhook integration found for channel_id: {channel_id}")
                    return
                
                # Get user settings for translation preferences
                user_settings = db.query(UserSettings).filter(
                    UserSettings.user_id == user_id
                ).first()
                
                # Default translation settings
                source_lang = "auto"
                target_lang = "vi"  # Default to Vietnamese
                
                if user_settings:
                    source_lang = user_settings.src_lang or "auto"
                    target_lang = user_settings.trg_lang or "vi"
                
                # Detect language if auto
                if source_lang == "auto":
                    detection_result = self.translation_service.detect_language(content)
                    source_lang = detection_result.detected_language
                
                # Skip translation if source and target are the same
                if source_lang == target_lang:
                    logger.info(f"Source and target languages are the same ({source_lang}), skipping translation")
                    return
                
                # Translate the message
                logger.info(f"Auto-translating message from {source_lang} to {target_lang} for user {user_id}")
                translation_result = await self.translation_service.translate_text(
                    text=content,
                    source_lang=source_lang,
                    target_lang=target_lang,
                    user_id=user_id,
                    db=db
                )
                
                # Send translated message back to Discord channel
                translated_message = f"**Auto-translate ({source_lang} → {target_lang}):**\n{translation_result.translated_text}"
                await self.send_message(channel_id, translated_message)
                
                logger.info(f"Auto-translation sent to Discord channel {channel_id}")
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error in auto-translate: {str(e)}")
            # Don't send error messages for auto-translate to avoid spam

# Global Discord service instance
discord_service = DiscordService()