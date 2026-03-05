"""
Unit tests for user_profile module – format_user_context, format_user_info_response.
Location: backend/buffr_ai/tests/test_user_profile.py
"""
import unittest

from buffr_ai.user_profile import format_user_context, format_user_info_response


class TestFormatUserContext(unittest.TestCase):
    """format_user_context returns a one-line [Current user: ...] string for injection."""

    def test_name_and_phone(self):
        out = format_user_context({"name": "Jane", "phone": "+1234567890"})
        self.assertIn("[Current user:", out)
        self.assertIn("name is Jane", out)
        self.assertIn("phone is +1234567890", out)

    def test_first_last_name_fallback(self):
        out = format_user_context({"first_name": "Jane", "last_name": "Doe"})
        self.assertIn("name is Jane Doe", out)

    def test_name_only(self):
        out = format_user_context({"name": "Bob"})
        self.assertEqual(out, "[Current user: name is Bob.]")

    def test_phone_only(self):
        out = format_user_context({"phone": "+111"})
        self.assertEqual(out, "[Current user: phone is +111.]")

    def test_empty_profile_returns_empty(self):
        out = format_user_context({})
        self.assertEqual(out, "")

    def test_no_name_no_phone_returns_empty(self):
        out = format_user_context({"id": "u1", "email": "a@b.com"})
        self.assertEqual(out, "")


class TestFormatUserInfoResponse(unittest.TestCase):
    """format_user_info_response is used by get_user_info tool (DRY)."""

    def test_none_returns_no_access_message(self):
        out = format_user_info_response(None)
        self.assertIn("don't have access", out)
        self.assertIn("profile section", out)

    def test_full_profile(self):
        out = format_user_info_response({"name": "Jane", "phone": "+123"})
        self.assertIn("Name: Jane", out)
        self.assertIn("Phone: +123", out)

    def test_first_last_fallback(self):
        out = format_user_info_response({"first_name": "A", "last_name": "B"})
        self.assertIn("Name: A B", out)

    def test_empty_profile_returns_onboarding_message(self):
        out = format_user_info_response({})
        self.assertIn("name and phone are not set", out)

    def test_only_phone(self):
        out = format_user_info_response({"phone": "+999"})
        self.assertIn("Phone: +999", out)
        self.assertNotIn("Name:", out)
