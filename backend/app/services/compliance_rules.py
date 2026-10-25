from pathlib import Path
import yaml
from typing import Any

RULES_PATH = Path(__file__).resolve().parent.parent / "rules" / "rules_aph_2025_2026.yaml"

class ComplianceRuleEngine:
    def __init__(self, rules_file: Path = RULES_PATH):
        self.rules_file = rules_file
        self.config = self._load_rules()

    def _load_rules(self) -> dict[str, Any]:
        if not self.rules_file.exists():
            return {
                "ruleset_version": "2025-2026.v1",
                "categories": [],
                "rules": []
            }
        with open(self.rules_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    @property
    def ruleset_version(self) -> str:
        return self.config.get("ruleset_version", "2025-2026.v1")

    def get_mandatory_documents(self, category_code: str) -> list[str]:
        for cat in self.config.get("categories", []):
            if cat.get("code") == category_code:
                docs = cat.get("mandatory_documents", [])
                result = []
                for d in docs:
                    if isinstance(d, dict):
                        result.append(d.get("code"))
                    elif isinstance(d, str):
                        result.append(d)
                return result
        return []

    def get_category_info(self, category_code: str) -> dict | None:
        for cat in self.config.get("categories", []):
            if cat.get("code") == category_code:
                return cat
        return None

    def get_rules_for_category(self, category_code: str) -> list[dict]:
        matching = []
        for rule in self.config.get("rules", []):
            if category_code in rule.get("category_codes", []):
                matching.append(rule)
        return matching

    def get_rule_by_code(self, rule_code: str) -> dict | None:
        for rule in self.config.get("rules", []):
            if rule.get("rule_code") == rule_code:
                return rule
        return None

    def reload(self):
        self.config = self._load_rules()

# Singleton instance
compliance_engine = ComplianceRuleEngine()
