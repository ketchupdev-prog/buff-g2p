"""
PII Protection Middleware

Location: smartpay_ai/middleware/pii_protection.py
Purpose: Redact personally identifiable information (PII) from AI responses
Compliance: PSD-12, data protection regulations

Protected PII types:
  - Phone numbers: 0812345678 → 081***5678
  - Emails: user@email.com → u***@email.com
  - Wallet IDs: WALLET123456 → WAL***3456
  - National IDs: ID9876543 → ID***543
  - Account numbers: ACC123456789 → ACC***789
"""

import re
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PIIProtector:
    """
    Detect and redact PII from text
    
    Patterns:
    - Namibian phone numbers: +264811234567 or 0811234567
    - Email addresses: user@domain.com
    - Wallet IDs: WALLET_xxx, wallet-xxx, various formats
    - National IDs: Various ID formats
    - Account numbers: ACC_xxx, ACCT-xxx
    """

    # Regex patterns for PII detection
    PATTERNS = {
        'phone': [
            r'\+264[0-9]{9}',                    # +264811234567
            r'\b0[0-9]{9}\b',                    # 0811234567
            r'\b[0-9]{3}[-\s]?[0-9]{3}[-\s]?[0-9]{4}\b',  # 081-123-4567
        ],
        'email': [
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        ],
        'wallet_id': [
            r'\bWALLET[-_]?[A-Z0-9]{6,}\b',
            r'\bwallet[-_]?[a-z0-9]{6,}\b',
            r'\bWAL[A-Z0-9]{6,}\b',
        ],
        'national_id': [
            r'\bID[0-9]{7,10}\b',
            r'\bNAT[-_]?ID[-_]?[0-9]{7,10}\b',
        ],
        'account_number': [
            r'\bACC[-_]?[0-9]{9,12}\b',
            r'\bACCT[-_]?[0-9]{9,12}\b',
            r'\b[0-9]{10,16}\b(?=.*account)',   # Account context required
        ],
    }

    def __init__(self, enable_logging: bool = True):
        """
        Initialize PII protector
        
        Args:
            enable_logging: Whether to log PII violations
        """
        self.enable_logging = enable_logging
        self.violation_log: List[Dict[str, Any]] = []

    def redact_phone(self, text: str) -> str:
        """
        Redact phone numbers: 0812345678 → 081***5678
        
        Args:
            text: Input text
            
        Returns:
            Text with redacted phone numbers
        """
        for pattern in self.PATTERNS['phone']:
            def replace_phone(match):
                phone = match.group(0)
                if len(phone) >= 8:
                    return phone[:3] + '***' + phone[-4:]
                return '***' + phone[-4:]
            
            text = re.sub(pattern, replace_phone, text)
        
        return text

    def redact_email(self, text: str) -> str:
        """
        Redact email addresses: user@email.com → u***@email.com
        
        Args:
            text: Input text
            
        Returns:
            Text with redacted emails
        """
        for pattern in self.PATTERNS['email']:
            def replace_email(match):
                email = match.group(0)
                username, domain = email.split('@')
                if len(username) > 1:
                    return username[0] + '***@' + domain
                return '***@' + domain
            
            text = re.sub(pattern, replace_email, text)
        
        return text

    def redact_wallet_id(self, text: str) -> str:
        """
        Redact wallet IDs: WALLET123456 → WAL***3456
        
        Args:
            text: Input text
            
        Returns:
            Text with redacted wallet IDs
        """
        for pattern in self.PATTERNS['wallet_id']:
            def replace_wallet(match):
                wallet = match.group(0)
                if len(wallet) >= 8:
                    return wallet[:3] + '***' + wallet[-4:]
                return '***' + wallet[-4:]
            
            text = re.sub(pattern, replace_wallet, text, flags=re.IGNORECASE)
        
        return text

    def redact_national_id(self, text: str) -> str:
        """
        Redact national IDs: ID9876543 → ID***543
        
        Args:
            text: Input text
            
        Returns:
            Text with redacted national IDs
        """
        for pattern in self.PATTERNS['national_id']:
            def replace_id(match):
                id_num = match.group(0)
                if len(id_num) >= 7:
                    return id_num[:2] + '***' + id_num[-3:]
                return '***'
            
            text = re.sub(pattern, replace_id, text)
        
        return text

    def redact_account_number(self, text: str) -> str:
        """
        Redact account numbers: ACC123456789 → ACC***789
        
        Args:
            text: Input text
            
        Returns:
            Text with redacted account numbers
        """
        for pattern in self.PATTERNS['account_number']:
            def replace_account(match):
                account = match.group(0)
                if len(account) >= 9:
                    return account[:3] + '***' + account[-3:]
                return '***' + account[-3:]
            
            text = re.sub(pattern, replace_account, text)
        
        return text

    def redact_pii(self, text: str) -> str:
        """
        Redact all PII types from text
        
        Args:
            text: Input text
            
        Returns:
            Text with all PII redacted
        """
        if not text:
            return text
        
        original_text = text
        
        # Apply all redaction functions
        text = self.redact_phone(text)
        text = self.redact_email(text)
        text = self.redact_wallet_id(text)
        text = self.redact_national_id(text)
        text = self.redact_account_number(text)
        
        # Log if PII was found and redacted
        if text != original_text and self.enable_logging:
            self._log_pii_redaction(original_text, text)
        
        return text

    def detect_pii_leakage(self, text: str) -> bool:
        """
        Detect if text contains PII (without redacting)
        
        Args:
            text: Text to check
            
        Returns:
            True if PII detected
        """
        if not text:
            return False
        
        # Check all patterns
        for pii_type, patterns in self.PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return True
        
        return False

    def get_pii_types(self, text: str) -> List[str]:
        """
        Get list of PII types found in text
        
        Args:
            text: Text to analyze
            
        Returns:
            List of PII type names
        """
        if not text:
            return []
        
        found_types = []
        
        for pii_type, patterns in self.PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    if pii_type not in found_types:
                        found_types.append(pii_type)
                    break
        
        return found_types

    def _log_pii_redaction(self, original: str, redacted: str):
        """
        Log PII redaction event
        
        Args:
            original: Original text
            redacted: Redacted text
        """
        pii_types = self.get_pii_types(original)
        
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'pii_types': pii_types,
            'original_length': len(original),
            'redacted_length': len(redacted),
            'redaction_count': len(pii_types),
        }
        
        self.violation_log.append(log_entry)
        
        logger.info(f"PII redacted: {', '.join(pii_types)}")

    def log_pii_violation(
        self,
        response: str,
        user_id: Optional[str] = None,
        context: Optional[str] = None
    ):
        """
        Log a PII leakage violation
        
        Args:
            response: Response text containing PII
            user_id: User ID if available
            context: Context of the violation
        """
        pii_types = self.get_pii_types(response)
        
        violation = {
            'timestamp': datetime.now().isoformat(),
            'user_id': user_id,
            'context': context,
            'pii_types': pii_types,
            'severity': 'high' if len(pii_types) > 2 else 'medium',
        }
        
        self.violation_log.append(violation)
        
        logger.error(
            f"PII VIOLATION: {', '.join(pii_types)} leaked "
            f"(user: {user_id}, context: {context})"
        )

    def get_violation_summary(self) -> Dict[str, Any]:
        """
        Get summary of PII violations
        
        Returns:
            Summary statistics
        """
        if not self.violation_log:
            return {
                'total_violations': 0,
                'pii_types': {},
            }
        
        pii_type_counts = {}
        for entry in self.violation_log:
            for pii_type in entry.get('pii_types', []):
                pii_type_counts[pii_type] = pii_type_counts.get(pii_type, 0) + 1
        
        return {
            'total_violations': len(self.violation_log),
            'pii_types': pii_type_counts,
            'recent_violations': self.violation_log[-10:],  # Last 10
        }


# Global protector instance
_protector = PIIProtector()


def redact_pii(text: str) -> str:
    """
    Convenience function to redact PII from text
    
    Args:
        text: Input text
        
    Returns:
        Text with PII redacted
    """
    return _protector.redact_pii(text)


def detect_pii_leakage(text: str) -> bool:
    """
    Convenience function to detect PII in text
    
    Args:
        text: Text to check
        
    Returns:
        True if PII detected
    """
    return _protector.detect_pii_leakage(text)


def log_pii_violation(
    response: str,
    user_id: Optional[str] = None,
    context: Optional[str] = None
):
    """
    Convenience function to log PII violation
    
    Args:
        response: Response containing PII
        user_id: User ID
        context: Context
    """
    _protector.log_pii_violation(response, user_id, context)


def protect_response(response: str, user_id: Optional[str] = None) -> str:
    """
    Protect an AI response by redacting PII
    
    Args:
        response: AI response text
        user_id: User ID for logging
        
    Returns:
        Protected response
    """
    # Check if PII exists
    if detect_pii_leakage(response):
        logger.warning(f"PII detected in response for user {user_id}")
        
        # Log violation
        log_pii_violation(response, user_id, context="ai_response")
        
        # Redact PII
        protected = redact_pii(response)
        
        return protected
    
    return response


def test_pii_protection():
    """Test PII protection functionality"""
    test_cases = [
        ("My phone is 0812345678", "My phone is 081***5678"),
        ("Email me at user@example.com", "Email me at u***@example.com"),
        ("Wallet ID: WALLET123456", "Wallet ID: WAL***3456"),
        ("Contact +264811234567", "Contact +26***4567"),
        ("ID number: ID9876543", "ID number: ID***543"),
    ]
    
    print("\n" + "=" * 80)
    print("PII PROTECTION TEST")
    print("=" * 80)
    
    protector = PIIProtector(enable_logging=False)
    
    for original, expected in test_cases:
        redacted = protector.redact_pii(original)
        passed = redacted == expected
        
        status = "✓" if passed else "✗"
        print(f"\n{status} Test: {original}")
        print(f"  Expected: {expected}")
        print(f"  Got:      {redacted}")
        
        if not passed:
            print(f"  MISMATCH!")
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    test_pii_protection()
