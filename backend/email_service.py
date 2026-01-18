from typing import List, Dict, Any
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from config import settings
from pydantic import EmailStr
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=settings.USE_CREDENTIALS,
    VALIDATE_CERTS=settings.VALIDATE_CERTS
)

class EmailService:
    def __init__(self):
        self.fastmail = FastMail(conf)

    async def send_email(
        self, 
        email: List[EmailStr], 
        subject: str, 
        body: str
    ):
        """Send a generic email."""
        message = MessageSchema(
            subject=subject,
            recipients=email,
            body=body,
            subtype=MessageType.html
        )
        
        try:
            await self.fastmail.send_message(message)
            return True
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False

    async def send_welcome_email(self, email: str, name: str):
        """Send welcome email to new user."""
        subject = "Welcome to SmartPath!"
        body = f"""
        <h1>Welcome to SmartPath, {name}!</h1>
        <p>We're excited to have you on board. SmartPath is your AI-powered companion for academic success.</p>
        <p>Get started by:</p>
        <ul>
            <li>Uploading your report card</li>
            <li>Setting up your study plan</li>
            <li>Exploring career recommendations</li>
        </ul>
        <p>Happy Learning!</p>
        <p>The SmartPath Team</p>
        """
        await self.send_email([email], subject, body)

    async def send_reset_password_email(self, email: str, token: str):
        """Send password reset email."""
        # In production, this would be your frontend URL
        reset_link = f"http://localhost:5173/reset-password?token={token}"
        
        subject = "Reset Your Password - SmartPath"
        body = f"""
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <p><a href="{reset_link}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>Or copy this link: {reset_link}</p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        """
        await self.send_email([email], subject, body)

email_service = EmailService()
