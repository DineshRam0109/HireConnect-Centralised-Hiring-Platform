import { createContext, useEffect, useState } from "react";
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth, useUser } from '@clerk/clerk-react';

export const AppContext = createContext();

export const AppContextProvider = (props) => {
    const [searchFilter, setSearchFilter] = useState({
        title: '',
        location: ''
    });

    const [jobs, setJobs] = useState([]);
    const [companyToken, setCompanyToken] = useState(localStorage.getItem('companyToken') || null);
    const [companyData, setCompanyData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [userApplications, setUserApplications] = useState([]);
    const [showRecruiterLogin, setShowRecruiterLogin] = useState(false);
    const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    const { getToken, isSignedIn } = useAuth();
    const { user } = useUser();

    // Fetch all jobs
    const fetchJobs = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/jobs');
            if (data.success) {
                setJobs(data.jobs);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
            toast.error(error.message);
        }
    };

    // Fetch user data with profile completion check
    const fetchUserData = async () => {
        if (!isSignedIn || !user) {
            setUserData(null);
            setNeedsProfileCompletion(false);
            return;
        }

        try {
            const token = await getToken();
            if (!token) {
                console.error('No token available');
                return;
            }

            const { data } = await axios.get(backendUrl + '/api/users/user', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success) {
                setUserData(data.user);
                setNeedsProfileCompletion(data.needsProfileCompletion || false);
                
                if (data.needsProfileCompletion) {
                    // Try to create user with Clerk data if profile is incomplete
                    await createUserFromClerk();
                }
            } else {
                console.error('Failed to fetch user data:', data.message);
                // If user not found, try to create user with Clerk data
                if (data.message.includes('User not found')) {
                    await createUserFromClerk();
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            // Try to create user if fetch fails
            if (error.response?.data?.message?.includes('User not found')) {
                await createUserFromClerk();
            }
        }
    };

    // Create user from Clerk data with better data extraction
    const createUserFromClerk = async () => {
        if (!user || !isSignedIn) return;
        
        try {
            const token = await getToken();
            if (!token) return;

            // Extract email from Clerk user object
            let userEmail = '';
            if (user.emailAddresses && user.emailAddresses.length > 0) {
                // Find primary email or use first email
                const primaryEmail = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId);
                userEmail = primaryEmail ? primaryEmail.emailAddress : user.emailAddresses[0].emailAddress;
            } else if (user.primaryEmailAddress) {
                userEmail = user.primaryEmailAddress.emailAddress;
            }

            // Extract name from Clerk user object
            let userName = '';
            if (user.firstName && user.lastName) {
                userName = `${user.firstName.trim()} ${user.lastName.trim()}`;
            } else if (user.firstName) {
                userName = user.firstName.trim();
            } else if (user.lastName) {
                userName = user.lastName.trim();
            } else if (user.username) {
                userName = user.username.trim();
            } else if (userEmail) {
                // Extract name from email as last resort
                userName = userEmail.split('@')[0];
            } else {
                userName = 'User';
            }

            const userData = {
                _id: user.id,
                email: userEmail,
                name: userName,
                image: user.imageUrl || user.profileImageUrl || '',
                resume: ''
            };

            console.log('Creating user from Clerk with data:', userData);

            const { data } = await axios.post(backendUrl + '/api/users/create', userData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success) {
                setUserData(data.user);
                setNeedsProfileCompletion(!data.user.email || !data.user.email.trim() || data.user.name === 'User');
                console.log('User created successfully from Clerk data');
                
                if (!data.user.email || !data.user.email.trim()) {
                    toast.info('Please complete your profile with a valid email address');
                }
            } else {
                console.error('Failed to create user from Clerk:', data.message);
            }
        } catch (error) {
            console.error('Error creating user from Clerk:', error);
        }
    };

    // Update user profile
    const updateUserProfile = async (profileData) => {
        if (!isSignedIn || !user) {
            toast.error('Please log in to update your profile');
            return { success: false };
        }

        try {
            const token = await getToken();
            if (!token) {
                toast.error('Authentication required');
                return { success: false };
            }

            const { data } = await axios.put(backendUrl + '/api/users/profile', profileData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success) {
                setUserData(data.user);
                setNeedsProfileCompletion(false);
                toast.success(data.message || 'Profile updated successfully');
                return { success: true };
            } else {
                toast.error(data.message || 'Failed to update profile');
                return { success: false };
            }
        } catch (error) {
            console.error('Error updating user profile:', error);
            toast.error('Failed to update profile');
            return { success: false };
        }
    };

    // Fetch user applications
    const fetchUserApplications = async () => {
        if (!isSignedIn || !user) {
            setUserApplications([]);
            return;
        }

        try {
            const token = await getToken();
            if (!token) {
                console.error('No token available');
                return;
            }

            const { data } = await axios.get(backendUrl + '/api/users/applied-jobs', {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Applications API response:', data);

            if (data.success) {
                setUserApplications(data.applications || []);
                console.log('Set applications:', data.applications?.length || 0);
            } else {
                console.error('Failed to fetch user applications:', data.message);
                setUserApplications([]);
            }
        } catch (error) {
            console.error('Error fetching user applications:', error);
            setUserApplications([]);
        }
    };

    // Fetch company data
    const fetchCompanyData = async () => {
        if (!companyToken) {
            setCompanyData(null);
            return;
        }

        try {
            const { data } = await axios.get(backendUrl + '/api/company/company', {
                headers: { token: companyToken }
            });

            if (data.success) {
                setCompanyData(data.company);
            } else {
                console.error('Failed to fetch company data:', data.message);
                // Invalid token, clear it
                setCompanyToken(null);
                localStorage.removeItem('companyToken');
            }
        } catch (error) {
            console.error('Error fetching company data:', error);
            // On error, clear invalid token
            setCompanyToken(null);
            localStorage.removeItem('companyToken');
        }
    };

    // Effect for fetching jobs on mount
    useEffect(() => {
        fetchJobs();
    }, []);

    // Effect for handling user authentication state
    useEffect(() => {
        if (isSignedIn && user) {
            fetchUserData();
        } else {
            setUserData(null);
            setUserApplications([]);
            setNeedsProfileCompletion(false);
        }
    }, [isSignedIn, user]);

    // Effect for fetching user applications when userData is available
    useEffect(() => {
        if (userData && isSignedIn && user && !needsProfileCompletion) {
            fetchUserApplications();
        }
    }, [userData, isSignedIn, user, needsProfileCompletion]);

    // Effect for handling company token changes
    useEffect(() => {
        if (companyToken) {
            fetchCompanyData();
        } else {
            setCompanyData(null);
        }
    }, [companyToken]);

    const value = {
        searchFilter, setSearchFilter,
        jobs, setJobs,
        companyToken, setCompanyToken,
        companyData, setCompanyData,
        backendUrl,
        userData, setUserData,
        userApplications, setUserApplications,
        needsProfileCompletion, setNeedsProfileCompletion,
        fetchJobs,
        fetchUserData,
        fetchUserApplications,
        fetchCompanyData,
        createUserFromClerk,
        updateUserProfile,
        showRecruiterLogin, setShowRecruiterLogin
    };

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
};