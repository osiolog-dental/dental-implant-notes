import requests
import sys
import json
from datetime import datetime

class DentalAppAPITester:
    def __init__(self, base_url="https://dental-implant-notes.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.user_token = None
        self.demo_doctor_id = None
        self.patient_id = None
        self.clinic_id = None
        self.implant_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, use_cookies=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 200:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_login(self):
        """Test login with demo credentials"""
        success, response = self.run_test(
            "Doctor Login",
            "POST",
            "auth/login",
            200,
            data={"email": "doctor@dentalapp.com", "password": "doctor123"}
        )
        if success and '_id' in response:
            self.demo_doctor_id = response['_id']
            print(f"   Logged in as: {response.get('name', 'Unknown')}")
            return True
        return False

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_auth_register(self):
        """Test doctor registration"""
        test_email = f"test_doctor_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "Doctor Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "name": "Dr. Test Doctor",
                "phone": "+1555999888",
                "country": "USA",
                "registration_number": "TEST123",
                "college": "Harvard School of Dental Medicine",
                "specialization": "Implantology"
            }
        )
        return success

    def test_get_patients(self):
        """Test getting patients list"""
        success, response = self.run_test(
            "Get Patients List",
            "GET",
            "patients",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            self.patient_id = response[0]['_id']
            print(f"   Found {len(response)} patients")
        return success

    def test_create_patient(self):
        """Test creating a new patient"""
        success, response = self.run_test(
            "Create Patient",
            "POST",
            "patients",
            200,
            data={
                "name": "Test Patient",
                "age": 35,
                "gender": "Male",
                "phone": "+1555777888",
                "email": "test.patient@email.com",
                "address": "123 Test St, Test City",
                "medical_history": "No significant medical history"
            }
        )
        if success and '_id' in response:
            self.patient_id = response['_id']
        return success

    def test_get_patient_details(self):
        """Test getting specific patient details"""
        if not self.patient_id:
            print("❌ Skipped - No patient ID available")
            return False
            
        success, response = self.run_test(
            "Get Patient Details",
            "GET",
            f"patients/{self.patient_id}",
            200
        )
        return success

    def test_get_clinics(self):
        """Test getting clinics list"""
        success, response = self.run_test(
            "Get Clinics List",
            "GET",
            "clinics",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            self.clinic_id = response[0]['_id']
            print(f"   Found {len(response)} clinics")
        return success

    def test_create_clinic(self):
        """Test creating a new clinic"""
        success, response = self.run_test(
            "Create Clinic",
            "POST",
            "clinics",
            200,
            data={
                "name": "Test Dental Clinic",
                "address": "456 Test Ave, Test City",
                "phone": "+1555666777",
                "email": "test@testclinic.com"
            }
        )
        if success and '_id' in response:
            self.clinic_id = response['_id']
        return success

    def test_get_implants(self):
        """Test getting implants list"""
        success, response = self.run_test(
            "Get Implants List",
            "GET",
            "implants",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} implants")
            if len(response) > 0:
                self.implant_id = response[0]['_id']
        return success

    def test_create_implant(self):
        """Test creating a new implant"""
        if not self.patient_id:
            print("❌ Skipped - No patient ID available")
            return False
            
        success, response = self.run_test(
            "Create Implant",
            "POST",
            "implants",
            200,
            data={
                "patient_id": self.patient_id,
                "tooth_number": 16,
                "implant_type": "Single",
                "brand": "Straumann",
                "size": "4.1mm",
                "length": "10mm",
                "insertion_torque": 35.0,
                "connection_type": "Internal Hex",
                "surgical_approach": "Immediate Placement",
                "bone_graft": "Xenograft",
                "sinus_lift_type": None,
                "is_pterygoid": False,
                "is_zygomatic": False,
                "is_subperiosteal": False,
                "notes": "Test implant creation",
                "clinic_id": self.clinic_id
            }
        )
        if success and '_id' in response:
            self.implant_id = response['_id']
        return success

    def test_get_implant_details(self):
        """Test getting specific implant details"""
        if not self.implant_id:
            print("❌ Skipped - No implant ID available")
            return False
            
        success, response = self.run_test(
            "Get Implant Details",
            "GET",
            f"implants/{self.implant_id}",
            200
        )
        return success

    def test_analytics_overview(self):
        """Test analytics overview endpoint"""
        success, response = self.run_test(
            "Analytics Overview",
            "GET",
            "analytics/overview",
            200
        )
        if success:
            print(f"   Stats: {response}")
        return success

    def test_analytics_financial(self):
        """Test financial analytics endpoint"""
        success, response = self.run_test(
            "Financial Analytics",
            "GET",
            "analytics/financial",
            200
        )
        if success:
            print(f"   Financial: {response}")
        return success

    def test_auth_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

def main():
    print("🦷 Starting Dental App API Testing...")
    print("=" * 50)
    
    tester = DentalAppAPITester()
    
    # Test sequence
    tests = [
        # Authentication tests
        ("Login", tester.test_auth_login),
        ("Get Current User", tester.test_auth_me),
        
        # Patient management tests
        ("Get Patients", tester.test_get_patients),
        ("Create Patient", tester.test_create_patient),
        ("Get Patient Details", tester.test_get_patient_details),
        
        # Clinic management tests
        ("Get Clinics", tester.test_get_clinics),
        ("Create Clinic", tester.test_create_clinic),
        
        # Implant management tests
        ("Get Implants", tester.test_get_implants),
        ("Create Implant", tester.test_create_implant),
        ("Get Implant Details", tester.test_get_implant_details),
        
        # Analytics tests
        ("Analytics Overview", tester.test_analytics_overview),
        ("Financial Analytics", tester.test_analytics_financial),
        
        # Registration test (creates new user)
        ("Doctor Registration", tester.test_auth_register),
        
        # Logout test
        ("Logout", tester.test_auth_logout),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if not result:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())