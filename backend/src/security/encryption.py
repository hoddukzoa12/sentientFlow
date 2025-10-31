"""Encryption service for sensitive data like API keys."""

import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)


class EncryptionService:
    """Service for encrypting and decrypting sensitive data using Fernet (symmetric encryption)."""

    def __init__(self):
        """Initialize the encryption service with a key from environment variables."""
        encryption_key = os.getenv("ENCRYPTION_KEY")

        if not encryption_key:
            raise ValueError(
                "ENCRYPTION_KEY environment variable is not set. "
                "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )

        try:
            self.fernet = Fernet(encryption_key.encode())
            logger.info("Encryption service initialized successfully")
        except Exception as e:
            raise ValueError(f"Invalid ENCRYPTION_KEY format: {str(e)}")

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a plaintext string.

        Args:
            plaintext: The string to encrypt

        Returns:
            Base64-encoded encrypted string

        Raises:
            ValueError: If plaintext is empty or encryption fails
        """
        if not plaintext:
            raise ValueError("Cannot encrypt empty string")

        try:
            encrypted_bytes = self.fernet.encrypt(plaintext.encode())
            return encrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise ValueError(f"Encryption failed: {str(e)}")

    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt a ciphertext string.

        Args:
            ciphertext: The Base64-encoded encrypted string

        Returns:
            Decrypted plaintext string

        Raises:
            ValueError: If ciphertext is invalid or decryption fails
        """
        if not ciphertext:
            raise ValueError("Cannot decrypt empty string")

        try:
            decrypted_bytes = self.fernet.decrypt(ciphertext.encode())
            return decrypted_bytes.decode()
        except InvalidToken:
            logger.error("Invalid token during decryption")
            raise ValueError("Invalid or corrupted ciphertext")
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise ValueError(f"Decryption failed: {str(e)}")


# Singleton instance
encryption_service = EncryptionService()
