import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function PhoneVerification() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState('phone'); // 'phone', 'otp', 'success'
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [userData, setUserData] = useState(null);

  // Configure invisible reCAPTCHA
  const setupRecaptcha = () => {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  };

  // Send OTP to user's phone
  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      setupRecaptcha();
      
      const formattedPhoneNumber = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+${phoneNumber}`;
      
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
      
      setVerificationId(confirmationResult.verificationId);
      setVerificationStep('otp');
      setLoading(false);
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError(`Failed to send verification code: ${error.message}`);
      setLoading(false);
      
      // Reset reCAPTCHA
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    }
  };

  // Verify the OTP entered by user
  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Create credential with the verification ID and OTP
      const credential = await auth.signInWithCredential(
        auth.PhoneAuthProvider.credential(verificationId, otp)
      );
      
      // Get the user token
      const token = await credential.user.getIdToken();
      
      // Send token to API and get user data
      const userInfo = await fetchUserData(token);
      setUserData(userInfo);
      
      setVerificationStep('success');
      setSuccessMessage('Phone number verified successfully!');
      setLoading(false);
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setError(`Failed to verify code: ${error.message}`);
      setLoading(false);
    }
  };

  // Fetch user data using the token
  const fetchUserData = async (token) => {
    try {
      const response = await fetch('https://admin.evento.international/api/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("User data retrieved:", data);
      return data;
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError(`Failed to fetch user data: ${error.message}`);
      throw error;
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg mt-52">
      <h1 className="text-2xl font-bold mb-6 text-center ">Phone Verification</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {successMessage}
        </div>
      )}
      
      {verificationStep === 'phone' && (
        <form onSubmit={sendOtp}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="phone">
              Phone Number (with country code)
            </label>
            <input
              id="phone"
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Include country code (e.g., +91 for India)
            </p>
          </div>
          
          <div id="recaptcha-container"></div>
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      )}
      
      {verificationStep === 'otp' && (
        <form onSubmit={verifyOtp}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="otp">
              Enter Verification Code
            </label>
            <input
              id="otp"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              type="button"
              className="w-1/2 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              onClick={() => setVerificationStep('phone')}
              disabled={loading}
            >
              Back
            </button>
            
            <button
              type="submit"
              className="w-1/2 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        </form>
      )}
      
      {verificationStep === 'success' && (
        <div className="text-center">
          <div className="mb-4 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold mb-4">Verification Successful</p>
          <p className="mb-4">Your phone has been verified and user data has been retrieved.</p>
          
          {userData && (
            <div className="mb-6 p-4 bg-gray-50 rounded text-left">
              <p className="font-semibold mb-2">User Information:</p>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(userData, null, 2)}
              </pre>
            </div>
          )}
          
          <button
            onClick={() => {
              setVerificationStep('phone');
              setPhoneNumber('');
              setOtp('');
              setError('');
              setSuccessMessage('');
              setUserData(null);
            }}
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Verify Another Number
          </button>
        </div>
      )}
    </div>
  );
}

export default PhoneVerification;