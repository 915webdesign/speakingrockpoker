#!/usr/bin/env python3
"""
Speaking Rock Poker Room Backend API Test Suite
Tests all API endpoints comprehensively using the external URL.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://rockpoker.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
STAFF_CREDENTIALS = {
    "username": "admin",
    "password": "admin123"
}

PLAYER_CREDENTIALS = {
    "card_number": "12345",
    "credential": "0199",
    "method": "phone"
}

class PokerAPITester:
    def __init__(self):
        self.staff_token = None
        self.player_token = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'PokerAPI-Tester/1.0'
        })
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        
        if success:
            self.results['passed'] += 1
        else:
            self.results['failed'] += 1
            self.results['errors'].append(f"{test_name}: {details}")

    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'status' in data and data['status'] == 'healthy':
                    self.log_result("Health Check", True, f"Status: {data['status']}")
                    return True
                else:
                    self.log_result("Health Check", False, f"Invalid response: {data}")
                    return False
            else:
                self.log_result("Health Check", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
            return False

    def test_staff_login(self):
        """Test staff login"""
        try:
            response = self.session.post(
                f"{API_BASE}/auth/staff/login",
                json=STAFF_CREDENTIALS,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data and 'staff' in data:
                    self.staff_token = data['token']
                    staff_info = data['staff']
                    self.log_result("Staff Login", True, 
                                  f"User: {staff_info.get('name', 'N/A')}, Role: {staff_info.get('role', 'N/A')}")
                    return True
                else:
                    self.log_result("Staff Login", False, f"Missing token or staff info: {data}")
                    return False
            else:
                self.log_result("Staff Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Staff Login", False, f"Exception: {str(e)}")
            return False

    def test_player_login(self):
        """Test player login"""
        try:
            response = self.session.post(
                f"{API_BASE}/auth/player/login",
                json=PLAYER_CREDENTIALS,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data and 'player' in data:
                    self.player_token = data['token']
                    player_info = data['player']
                    self.log_result("Player Login", True, 
                                  f"Player: {player_info.get('name', 'N/A')}, Card: {player_info.get('card_number', 'N/A')}")
                    return True
                else:
                    self.log_result("Player Login", False, f"Missing token or player info: {data}")
                    return False
            else:
                self.log_result("Player Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Player Login", False, f"Exception: {str(e)}")
            return False

    def test_games(self):
        """Test games endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/games", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    game_count = len(data)
                    game_names = [game.get('name', 'Unknown') for game in data]
                    self.log_result("Get Games", True, f"Found {game_count} games: {', '.join(game_names)}")
                    return True
                else:
                    self.log_result("Get Games", False, f"Expected list, got: {type(data)}")
                    return False
            else:
                self.log_result("Get Games", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Games", False, f"Exception: {str(e)}")
            return False

    def test_players(self):
        """Test players endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/players", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    player_count = len(data)
                    self.log_result("Get Players", True, f"Found {player_count} players")
                    return True
                else:
                    self.log_result("Get Players", False, f"Expected list, got: {type(data)}")
                    return False
            else:
                self.log_result("Get Players", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Players", False, f"Exception: {str(e)}")
            return False

    def test_player_by_card(self):
        """Test get player by card number"""
        try:
            card_number = PLAYER_CREDENTIALS['card_number']
            response = self.session.get(f"{API_BASE}/players/card/{card_number}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'cardNumber' in data or 'card_number' in data:
                    player_name = data.get('name', data.get('firstName', 'Unknown'))
                    self.log_result("Get Player by Card", True, f"Player: {player_name}")
                    return True
                else:
                    self.log_result("Get Player by Card", False, f"Missing card info: {data}")
                    return False
            else:
                self.log_result("Get Player by Card", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Player by Card", False, f"Exception: {str(e)}")
            return False

    def test_waitlist_get(self):
        """Test get waitlist"""
        try:
            response = self.session.get(f"{API_BASE}/waitlist", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and 'waitlists' in data:
                    total_count = data.get('total_count', 0)
                    waitlists = data['waitlists']
                    total_entries = sum(len(entries) for entries in waitlists.values())
                    self.log_result("Get Waitlist", True, f"Found {total_entries} waitlist entries across {len(waitlists)} games")
                    return True
                else:
                    self.log_result("Get Waitlist", False, f"Expected dict with 'waitlists' key, got: {data}")
                    return False
            else:
                self.log_result("Get Waitlist", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Waitlist", False, f"Exception: {str(e)}")
            return False

    def test_waitlist_join(self):
        """Test join waitlist"""
        try:
            waitlist_data = {
                "player_name": "Test Player",
                "phone": "9155559999",
                "game_id": "nlh-1-3",
                "num_players": 1
            }
            
            response = self.session.post(
                f"{API_BASE}/waitlist",
                json=waitlist_data,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.log_result("Join Waitlist", True, f"Joined waitlist: {data}")
                return True
            else:
                self.log_result("Join Waitlist", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Join Waitlist", False, f"Exception: {str(e)}")
            return False

    def test_tables_get(self):
        """Test get tables (requires staff auth)"""
        if not self.staff_token:
            self.log_result("Get Tables", False, "No staff token available")
            return False
            
        try:
            headers = {'Authorization': f'Bearer {self.staff_token}'}
            response = self.session.get(f"{API_BASE}/tables", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    table_count = len(data)
                    self.log_result("Get Tables", True, f"Found {table_count} tables")
                    return True
                else:
                    self.log_result("Get Tables", False, f"Expected list, got: {type(data)}")
                    return False
            else:
                self.log_result("Get Tables", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Tables", False, f"Exception: {str(e)}")
            return False

    def test_tables_create(self):
        """Test create table (requires staff auth)"""
        if not self.staff_token:
            self.log_result("Create Table", False, "No staff token available")
            return False
            
        try:
            table_data = {
                "table_number": 5,
                "game_id": "nlh-1-3",
                "capacity": 9
            }
            
            headers = {'Authorization': f'Bearer {self.staff_token}'}
            response = self.session.post(
                f"{API_BASE}/tables",
                json=table_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.log_result("Create Table", True, f"Created table: {data}")
                return True
            else:
                self.log_result("Create Table", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Create Table", False, f"Exception: {str(e)}")
            return False

    def test_tournaments(self):
        """Test tournaments endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/tournaments", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    tournament_count = len(data)
                    self.log_result("Get Tournaments", True, f"Found {tournament_count} tournaments")
                    return True
                else:
                    self.log_result("Get Tournaments", False, f"Expected list, got: {type(data)}")
                    return False
            else:
                self.log_result("Get Tournaments", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Tournaments", False, f"Exception: {str(e)}")
            return False

    def test_points_leaderboard(self):
        """Test points leaderboard"""
        try:
            response = self.session.get(f"{API_BASE}/points/leaderboard", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and 'leaderboard' in data:
                    leaderboard = data['leaderboard']
                    if isinstance(leaderboard, list):
                        leader_count = len(leaderboard)
                        top30_cutoff = data.get('top30_cutoff', 'N/A')
                        self.log_result("Points Leaderboard", True, f"Found {leader_count} leaders, Top 30 cutoff: {top30_cutoff}")
                        return True
                    else:
                        self.log_result("Points Leaderboard", False, f"Expected leaderboard to be list, got: {type(leaderboard)}")
                        return False
                else:
                    self.log_result("Points Leaderboard", False, f"Expected dict with 'leaderboard' key, got: {data}")
                    return False
            else:
                self.log_result("Points Leaderboard", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Points Leaderboard", False, f"Exception: {str(e)}")
            return False

    def test_flush_jackpots(self):
        """Test flush jackpots"""
        try:
            response = self.session.get(f"{API_BASE}/flush/jackpots", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict):
                    self.log_result("Flush Jackpots", True, f"Jackpots: {data}")
                    return True
                else:
                    self.log_result("Flush Jackpots", False, f"Expected dict, got: {type(data)}")
                    return False
            else:
                self.log_result("Flush Jackpots", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Flush Jackpots", False, f"Exception: {str(e)}")
            return False

    def test_flush_leaderboard(self):
        """Test flush leaderboard"""
        try:
            response = self.session.get(f"{API_BASE}/flush/leaderboard", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    leader_count = len(data)
                    self.log_result("Flush Leaderboard", True, f"Found {leader_count} flush leaders")
                    return True
                else:
                    self.log_result("Flush Leaderboard", False, f"Expected list, got: {type(data)}")
                    return False
            else:
                self.log_result("Flush Leaderboard", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Flush Leaderboard", False, f"Exception: {str(e)}")
            return False

    def test_activity_log(self):
        """Test activity log (requires staff auth)"""
        if not self.staff_token:
            self.log_result("Activity Log", False, "No staff token available")
            return False
            
        try:
            headers = {'Authorization': f'Bearer {self.staff_token}'}
            response = self.session.get(f"{API_BASE}/activity", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    activity_count = len(data)
                    self.log_result("Activity Log", True, f"Found {activity_count} activity entries")
                    return True
                else:
                    self.log_result("Activity Log", False, f"Expected list, got: {type(data)}")
                    return False
            else:
                self.log_result("Activity Log", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Activity Log", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🎯 Starting Speaking Rock Poker Room API Tests")
        print(f"🌐 Base URL: {BASE_URL}")
        print(f"📅 Test Time: {datetime.now().isoformat()}")
        print("=" * 60)
        
        # Basic tests
        self.test_health_check()
        
        # Authentication tests
        self.test_staff_login()
        self.test_player_login()
        
        # Public endpoint tests
        self.test_games()
        self.test_players()
        self.test_player_by_card()
        self.test_waitlist_get()
        self.test_waitlist_join()
        self.test_tournaments()
        self.test_points_leaderboard()
        self.test_flush_jackpots()
        self.test_flush_leaderboard()
        
        # Protected endpoint tests (require staff auth)
        self.test_tables_get()
        self.test_tables_create()
        self.test_activity_log()
        
        # Print summary
        print("=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📈 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = PokerAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)