import { Webhook } from "svix";
import User from "../models/User.js";
import dotenv from 'dotenv';
dotenv.config();

//API Controller function to manage Clerk user with database
const clerkWebhooks = async (req, res) => {
    try {
        // Create a Svix instance with clerk webhook secret
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
       
        // Verifying headers
        await whook.verify(JSON.stringify(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })

        // Getting data from request body
        const { data, type } = req.body

        console.log('Webhook received:', { type, userId: data.id }); // Debug log
        console.log('Raw Clerk data:', JSON.stringify(data, null, 2)); // Debug log

        // Switch case for different events
        switch (type) {
            case 'user.created': {
                try {
                    // Extract email - Clerk provides multiple email addresses, get the primary one
                    let userEmail = '';
                    if (data.email_addresses && data.email_addresses.length > 0) {
                        // Find primary email address
                        const primaryEmail = data.email_addresses.find(email => email.id === data.primary_email_address_id);
                        if (primaryEmail) {
                            userEmail = primaryEmail.email_address;
                        } else {
                            // Fallback to first email if primary not found
                            userEmail = data.email_addresses[0].email_address;
                        }
                    }

                    // Extract name with better handling
                    let userName = '';
                    if (data.first_name && data.last_name) {
                        userName = `${data.first_name.trim()} ${data.last_name.trim()}`;
                    } else if (data.first_name) {
                        userName = data.first_name.trim();
                    } else if (data.last_name) {
                        userName = data.last_name.trim();
                    } else if (data.username) {
                        userName = data.username.trim();
                    } else {
                        // Extract name from email as last resort
                        userName = userEmail ? userEmail.split('@')[0] : 'User';
                    }

                    const userData = {
                        _id: data.id,
                        email: userEmail,
                        name: userName,
                        image: data.image_url || data.profile_image_url || '',
                        resume: ''
                    }

                    console.log('Creating user with processed data:', userData); // Debug log

                    // Check if user already exists
                    const existingUser = await User.findById(data.id);
                    if (existingUser) {
                        console.log('User already exists, updating:', data.id);
                        // Update existing user with new data
                        const updatedUser = await User.findByIdAndUpdate(data.id, userData, { new: true });
                        console.log('User updated successfully:', updatedUser._id);
                    } else {
                        // Create new user
                        const newUser = await User.create(userData);
                        console.log('User created successfully:', newUser._id);
                    }
                    
                } catch (error) {
                    console.error('Error creating user:', error);
                    // Don't return error response here, let webhook complete
                }
                res.json({})
                break;
            }
            
            case 'user.updated': {
                try {
                    // Extract email - Clerk provides multiple email addresses, get the primary one
                    let userEmail = '';
                    if (data.email_addresses && data.email_addresses.length > 0) {
                        // Find primary email address
                        const primaryEmail = data.email_addresses.find(email => email.id === data.primary_email_address_id);
                        if (primaryEmail) {
                            userEmail = primaryEmail.email_address;
                        } else {
                            // Fallback to first email if primary not found
                            userEmail = data.email_addresses[0].email_address;
                        }
                    }

                    // Extract name with better handling
                    let userName = '';
                    if (data.first_name && data.last_name) {
                        userName = `${data.first_name.trim()} ${data.last_name.trim()}`;
                    } else if (data.first_name) {
                        userName = data.first_name.trim();
                    } else if (data.last_name) {
                        userName = data.last_name.trim();
                    } else if (data.username) {
                        userName = data.username.trim();
                    } else {
                        // Keep existing name if available, otherwise extract from email
                        const existingUser = await User.findById(data.id);
                        userName = (existingUser && existingUser.name !== 'User') ? existingUser.name : 
                                  (userEmail ? userEmail.split('@')[0] : 'User');
                    }

                    const userData = {
                        email: userEmail,
                        name: userName,
                        image: data.image_url || data.profile_image_url || '',
                    }

                    console.log('Updating user:', data.id, userData); // Debug log

                    const updatedUser = await User.findByIdAndUpdate(data.id, userData, { new: true });
                    console.log('User updated:', updatedUser ? 'success' : 'not found');
                    
                } catch (error) {
                    console.error('Error updating user:', error);
                }
                res.json({})
                break;
            }
            
            case 'user.deleted': {
                try {
                    console.log('Deleting user:', data.id); // Debug log
                    await User.findByIdAndDelete(data.id);
                    console.log('User deleted successfully');
                } catch (error) {
                    console.error('Error deleting user:', error);
                }
                res.json({})
                break;
            }

            default:
                console.log('Unhandled webhook type:', type);
                res.json({})
                break;
        }

    } catch (error) {
        console.log('Webhook verification failed:', error.message)
        res.status(400).json({ success: false, message: 'Webhook verification failed' })
    }
}

export { clerkWebhooks };