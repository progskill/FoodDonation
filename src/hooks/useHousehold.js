import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";

export const useHousehold = () => {
  const { currentUser } = useAuth();
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setHousehold(null);
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;
    
    // Query for household where user is the registrant
    const householdQuery = query(
      collection(db, "households"),
      where("registrantId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      householdQuery,
      (querySnapshot) => {
        if (!querySnapshot.empty) {
          const householdDoc = querySnapshot.docs[0];
          setHousehold({
            id: householdDoc.id,
            ...householdDoc.data()
          });
        } else {
          // Check if user is listed as a member in any household
          const memberQuery = query(
            collection(db, "households"),
            where("members", "array-contains", {
              email: currentUser.email,
              isRegistrant: false
            })
          );
          
          // For simplicity, we'll just set household to null if they're not the registrant
          // In a full implementation, you might want to search through all households
          setHousehold(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching household:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const getHouseholdSize = () => {
    return household?.memberCount || household?.members?.length || 0;
  };

  const isLargeHousehold = () => {
    return getHouseholdSize() >= 7;
  };

  const getMaxDonationPercentage = () => {
    return isLargeHousehold() ? 0.35 : 0.30; // 35% for 7+ members, 30% for smaller households
  };

  const isUserRegistrant = () => {
    return household?.registrantId === currentUser?.uid;
  };

  const canApplyForDonations = () => {
    if (!household || !currentUser) return false;
    
    // Check if user is the registrant
    if (isUserRegistrant()) return true;
    
    // Check if user is marked as someone who can apply
    const userMember = household.members?.find(
      member => member.email === currentUser.email && member.isRegistrant
    );
    
    return !!userMember;
  };

  const refreshHousehold = async () => {
    if (!household?.id) return;
    
    try {
      const householdDoc = await getDoc(doc(db, "households", household.id));
      if (householdDoc.exists()) {
        setHousehold({
          id: householdDoc.id,
          ...householdDoc.data()
        });
      }
    } catch (err) {
      console.error("Error refreshing household:", err);
      setError(err.message);
    }
  };

  return {
    household,
    loading,
    error,
    getHouseholdSize,
    isLargeHousehold,
    getMaxDonationPercentage,
    isUserRegistrant,
    canApplyForDonations,
    refreshHousehold,
    hasHousehold: !!household
  };
};