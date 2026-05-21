import csv
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_json(relative_path):
    with (ROOT / relative_path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_csv(relative_path):
    with (ROOT / relative_path).open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


class PrototypeIntegrityTest(unittest.TestCase):
    def test_api_json_files_have_no_utf8_bom(self):
        for path in (ROOT / "api").glob("*.json"):
            with self.subTest(path=path.name):
                self.assertNotEqual(path.read_bytes()[:3], b"\xef\xbb\xbf")

    def test_csv_sources_define_the_running_api_contract(self):
        event_rows = load_csv("data/events.csv")
        district_rows = load_csv("data/districts.csv")

        self.assertIn("isOverdue", event_rows[0])
        self.assertNotIn("todayEvents", district_rows[0])
        self.assertNotIn("pendingEvents", district_rows[0])
        self.assertNotIn("overdueEvents", district_rows[0])

    def test_api_data_relationships_are_valid(self):
        districts = load_json("api/districts.json")
        events = load_json("api/events.json")
        flow_stages = load_json("api/flowStages.json")
        suggestions = load_json("api/aiSuggestions.json")

        district_ids = {district["districtId"] for district in districts}
        event_ids = {event["eventId"] for event in events}

        self.assertEqual(len(districts), 4)
        self.assertEqual(len(events), 8)
        self.assertEqual(len(flow_stages), 5)
        self.assertEqual(len(suggestions), 4)

        for event in events:
            self.assertIn(event["districtId"], district_ids)
            self.assertRegex(event["priority"], r"^P[0-2]$")
            self.assertGreaterEqual(event["flowStage"], 0)
            self.assertLess(event["flowStage"], len(flow_stages))
            self.assertIsInstance(event["isOverdue"], bool)

        for suggestion in suggestions:
            self.assertIn(suggestion["eventId"], event_ids)
            self.assertGreaterEqual(suggestion["confidence"], 0)
            self.assertLessEqual(suggestion["confidence"], 100)

    def test_kpi_matches_event_and_district_data(self):
        districts = load_json("api/districts.json")
        events = load_json("api/events.json")
        kpi = load_json("api/kpi.json")

        open_events = [event for event in events if event["flowStage"] < 4]
        urgent = [event for event in open_events if event["priority"] == "P0"]
        overdue = [event for event in open_events if event["isOverdue"]]
        abnormal_districts = [
            district
            for district in districts
            if district["statusTone"] in {"danger", "warning"}
        ]

        self.assertEqual(kpi["total"], len(events))
        self.assertEqual(kpi["pending"], len(open_events))
        self.assertEqual(kpi["urgent"], len(urgent))
        self.assertEqual(kpi["overdue"], len(overdue))
        self.assertEqual(kpi["abnormalDistricts"], len(abnormal_districts))

        for district in districts:
            district_events = [
                event for event in events if event["districtId"] == district["districtId"]
            ]
            district_open = [event for event in district_events if event["flowStage"] < 4]
            district_overdue = [event for event in district_open if event["isOverdue"]]
            self.assertEqual(district["todayEvents"], len(district_events))
            self.assertEqual(district["pendingEvents"], len(district_open))
            self.assertEqual(district["overdueEvents"], len(district_overdue))

    def test_frontend_uses_api_layer_without_legacy_data_module(self):
        self.assertFalse((ROOT / "assets/js/data.js").exists())

        html = (ROOT / "index.html").read_text(encoding="utf-8")
        app_js = (ROOT / "assets/js/app.js").read_text(encoding="utf-8")
        dashboard_js = (ROOT / "assets/js/modules/dashboard.js").read_text(
            encoding="utf-8"
        )
        eventflow_js = (ROOT / "assets/js/modules/eventflow.js").read_text(
            encoding="utf-8"
        )
        aiassist_js = (ROOT / "assets/js/modules/aiassist.js").read_text(
            encoding="utf-8"
        )

        self.assertIn('id="module-container"', html)
        self.assertIn('type="module"', html)
        self.assertIn("./modules/dashboard.js", app_js)
        self.assertIn("app:navigate", app_js)
        self.assertIn("../api.js", dashboard_js)
        self.assertIn("P0 紧急", dashboard_js)
        self.assertIn("超时事件", dashboard_js)
        self.assertIn("flow-current-badge", eventflow_js)
        self.assertIn("查看该事件 AI 辅助建议", eventflow_js)
        self.assertIn('tab: "aiassist"', eventflow_js)
        self.assertIn("suggestion-card--focused", aiassist_js)
        self.assertIn("data-focus-event", aiassist_js)

    def test_v110_delivery_docs_exist(self):
        self.assertTrue((ROOT / "docs/v1.1.0更新规划.md").exists())
        self.assertTrue((ROOT / "docs/讲解提纲.md").exists())


if __name__ == "__main__":
    unittest.main()
