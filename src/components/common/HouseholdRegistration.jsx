import React, { useState, useEffect } from "react";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  updateDoc,
  doc 
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";

const HouseholdRegistration = ({ onComplete, onClose, existingHousehold = null }) => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [householdData, setHouseholdData] = useState({
    householdName: "",
    address: "",
    contactPhone: "",
    emergencyContact: "",
    members: [
      {
        name: "",
        email: "",
        phone: "",
        age: "",
        relationship: "head", // head, spouse, child, other
        dietaryRestrictions: "",
        isRegistrant: true
      }
    ]
  });

  useEffect(() => {
    if (existingHousehold) {
      setHouseholdData(existingHousehold);
    } else if (currentUser) {
      // Pre-populate with current user info
      setHouseholdData(prev => ({
        ...prev,
        members: [{
          ...prev.members[0],
          name: currentUser.displayName || "",
          email: currentUser.email || "",
          isRegistrant: true
        }]
      }));
    }
  }, [currentUser, existingHousehold]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setHouseholdData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMemberChange = (index, field, value) => {
    setHouseholdData(prev => ({
      ...prev,
      members: prev.members.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }));
  };

  const addMember = () => {
    setHouseholdData(prev => ({
      ...prev,
      members: [...prev.members, {
        name: "",
        email: "",
        phone: "",
        age: "",
        relationship: "other",
        dietaryRestrictions: "",
        isRegistrant: false
      }]
    }));
  };

  const removeMember = (index) => {
    if (householdData.members.length > 1) {
      setHouseholdData(prev => ({
        ...prev,
        members: prev.members.filter((_, i) => i !== index)
      }));
    }
  };

  const validateForm = () => {
    if (!householdData.householdName.trim()) {
      showError("Household name is required");
      return false;
    }
    if (!householdData.address.trim()) {
      showError("Address is required");
      return false;
    }
    if (!householdData.contactPhone.trim()) {
      showError("Contact phone is required");
      return false;
    }

    // Validate members
    for (let i = 0; i < householdData.members.length; i++) {
      const member = householdData.members[i];
      if (!member.name.trim()) {
        showError(`Member ${i + 1}: Name is required`);
        return false;
      }
      if (!member.age || isNaN(member.age) || member.age < 0 || member.age > 120) {
        showError(`Member ${i + 1}: Valid age is required`);
        return false;
      }
      // Email is optional, but if provided should be valid
      if (member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
        showError(`Member ${i + 1}: Invalid email format`);
        return false;
      }
    }

    // At least one member should be the registrant
    const hasRegistrant = householdData.members.some(member => member.isRegistrant);
    if (!hasRegistrant) {
      showError("At least one member must be marked as the registrant");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const householdPayload = {
        ...householdData,
        registrantId: currentUser?.uid || `guest_${Date.now()}`,
        registrantEmail: currentUser?.email || "",
        memberCount: householdData.members.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "active"
      };

      let householdId;
      
      if (existingHousehold && existingHousehold.id) {
        // Update existing household
        await updateDoc(doc(db, "households", existingHousehold.id), {
          ...householdPayload,
          updatedAt: serverTimestamp()
        });
        householdId = existingHousehold.id;
        showSuccess("Household updated successfully!");
      } else {
        // Create new household
        const docRef = await addDoc(collection(db, "households"), householdPayload);
        householdId = docRef.id;
        showSuccess("Household registered successfully!");
      }
      
      // Call completion callback with household data
      if (onComplete) {
        onComplete({
          id: householdId,
          ...householdPayload
        });
      }
      
    } catch (error) {
      console.error("Error saving household:", error);
      showError("Failed to save household. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const relationshipOptions = [
    { value: "head", label: "Head of Household" },
    { value: "spouse", label: "Spouse/Partner" },
    { value: "child", label: "Child" },
    { value: "parent", label: "Parent" },
    { value: "sibling", label: "Sibling" },
    { value: "relative", label: "Other Relative" },
    { value: "other", label: "Other" }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {existingHousehold ? "Update" : "Register"} Your Household
                </h2>
                <p className="text-gray-600 mt-1">
                  Register all household members to apply for food donations
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Household Information */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl border-2 border-blue-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                🏠 Household Information
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Household Name *
                  </label>
                  <input
                    type="text"
                    name="householdName"
                    value={householdData.householdName}
                    onChange={handleInputChange}
                    placeholder="e.g., Smith Family"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={householdData.contactPhone}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={householdData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main St, City, State, ZIP"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact (optional)
                  </label>
                  <input
                    type="text"
                    name="emergencyContact"
                    value={householdData.emergencyContact}
                    onChange={handleInputChange}
                    placeholder="Name and phone number"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>

            {/* Household Members */}
            <div className="bg-gradient-to-r from-green-50 to-yellow-50 p-6 rounded-xl border-2 border-green-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  👥 Household Members ({householdData.members.length})
                </h3>
                <button
                  type="button"
                  onClick={addMember}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  + Add Member
                </button>
              </div>
              
              <div className="space-y-6">
                {householdData.members.map((member, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl border-2 border-gray-200 relative">
                    {householdData.members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMember(index)}
                        className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xl"
                      >
                        ×
                      </button>
                    )}
                    
                    <div className="flex items-center mb-3">
                      <h4 className="text-lg font-medium text-gray-800">
                        Member {index + 1}
                        {member.isRegistrant && (
                          <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Registrant
                          </span>
                        )}
                      </h4>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                          placeholder="John Doe"
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email (optional)
                        </label>
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                          placeholder="john@example.com"
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone (optional)
                        </label>
                        <input
                          type="tel"
                          value={member.phone}
                          onChange={(e) => handleMemberChange(index, 'phone', e.target.value)}
                          placeholder="(555) 123-4567"
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Age *
                        </label>
                        <input
                          type="number"
                          value={member.age}
                          onChange={(e) => handleMemberChange(index, 'age', e.target.value)}
                          placeholder="25"
                          min="0"
                          max="120"
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Relationship *
                        </label>
                        <select
                          value={member.relationship}
                          onChange={(e) => handleMemberChange(index, 'relationship', e.target.value)}
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                          required
                        >
                          {relationshipOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dietary Restrictions
                        </label>
                        <input
                          type="text"
                          value={member.dietaryRestrictions}
                          onChange={(e) => handleMemberChange(index, 'dietaryRestrictions', e.target.value)}
                          placeholder="None, Vegetarian, etc."
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        />
                      </div>
                    </div>
                    
                    {!member.isRegistrant && (
                      <div className="mt-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={member.isRegistrant}
                            onChange={(e) => handleMemberChange(index, 'isRegistrant', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">
                            This member can apply for donations on behalf of the household
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">📋 Registration Guidelines</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• All household members must be registered to apply for donations</li>
                <li>• Only one application per household per donation item</li>
                <li>• Email addresses are optional but recommended for notifications</li>
                <li>• Households with 7+ members can apply for up to 35% of donation quantities</li>
                <li>• Keep your information updated for the best experience</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:border-gray-400 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? "Saving..." : existingHousehold ? "Update Household" : "Register Household"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HouseholdRegistration;