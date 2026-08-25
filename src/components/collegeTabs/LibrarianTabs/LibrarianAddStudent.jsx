import { useState, useEffect } from "react";
import { User, Mail, Lock, BookOpen, Phone, ArrowRight, Users } from "lucide-react";
import { signUp } from "../../../utils/api";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";

function AdminAddStudent() {
  const [registerForm, setRegisterForm] = useState({
    firstname: "",
    lastname: "",
    student_number: "",
    contact_number: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [librarianSchoolId, setLibrarianSchoolId] = useState(null);

  useEffect(() => {
    const schoolId = localStorage.getItem('schoolId');
    setLibrarianSchoolId(schoolId);
  }, []);

  const validateForm = () => {
    const errors = {};
    
    if (!registerForm.firstname.trim()) {
      errors.firstname = 'First name is required';
    }
    
    if (!registerForm.lastname.trim()) {
      errors.lastname = 'Last name is required';
    }
    
    if (!registerForm.student_number.trim()) {
      errors.student_number = 'Student number is required';
    }
    
    if (!registerForm.contact_number.trim()) {
      errors.contact_number = 'Contact number is required';
    } else if (!/^[0-9+\-\s()]+$/.test(registerForm.contact_number)) {
      errors.contact_number = 'Invalid contact number format';
    }
    
    if (!registerForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(registerForm.email)) {
      errors.email = 'Invalid email address';
    }
    
    if (!registerForm.password) {
      errors.password = 'Password is required';
    } else if (registerForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (!registerForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    return errors;
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError("");
    setRegisterSuccess("");

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setRegisterError(firstError);
      setRegisterLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await signUp(
        registerForm.email,
        registerForm.password,
        {
          role_id: 4,
          firstname: registerForm.firstname,
          lastname: registerForm.lastname,
          student_number: registerForm.student_number,
          contact_number: registerForm.contact_number,
        }
      );

      if (signUpError) throw signUpError;

      setRegisterSuccess("Student registered successfully!");
      setRegisterForm({
        firstname: "",
        lastname: "",
        student_number: "",
        contact_number: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      setRegisterError(err.message || "Registration failed. Please try again.");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-10 mb-6 shadow-sm mt-0">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">Register New Student</h2>
            <p className="text-[#64748B] text-sm">Add a new student to the library system</p>
          </div>
        </div>
        <div className="mt-4 border-t border-[#E2E8F0]" />
      </div>
      
      {registerError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600 text-sm">{registerError}</p>
        </div>
      )}
      
      {registerSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-600 text-sm">{registerSuccess}</p>
        </div>
      )}
      
      <Card padding="lg">
        <form onSubmit={handleRegisterStudent} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              id="firstname"
              label="First Name"
              type="text"
              value={registerForm.firstname}
              onChange={(e) => setRegisterForm({...registerForm, firstname: e.target.value})}
              required
            />
            <Input
              id="lastname"
              label="Last Name"
              type="text"
              value={registerForm.lastname}
              onChange={(e) => setRegisterForm({...registerForm, lastname: e.target.value})}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              id="student_number"
              label="Student Number"
              type="text"
              value={registerForm.student_number}
              onChange={(e) => setRegisterForm({...registerForm, student_number: e.target.value})}
              required
            />
            <Input
              id="contact_number"
              label="Contact Number"
              type="tel"
              value={registerForm.contact_number}
              onChange={(e) => setRegisterForm({...registerForm, contact_number: e.target.value})}
              required
            />
          </div>
          
          <Input
            id="email"
            label="Email"
            type="email"
            value={registerForm.email}
            onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
            required
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              id="password"
              label="Create Password"
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
              required
              minLength={8}
            />
            <Input
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              value={registerForm.confirmPassword}
              onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
              required
              minLength={8}
            />
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setRegisterForm({
                  firstname: "",
                  lastname: "",
                  student_number: "",
                  contact_number: "",
                  email: "",
                  password: "",
                  confirmPassword: "",
                });
                setRegisterError("");
                setRegisterSuccess("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={registerLoading}
              className="w-full sm:w-auto"
            >
              {registerLoading ? (
                'Registering...'
              ) : (
                <>
                  Register Student
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default AdminAddStudent;
