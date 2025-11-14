import React, { useContext, useEffect, useState } from 'react'
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify';

const RecruiterLogin = () => {
    const navigate = useNavigate()

    const [state, setState] = useState('Login')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [email, setEmail] = useState('')
    const [image, setImage] = useState(false)
    const [isTextDataSubmitted, setIsTextDataSubmitted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { setShowRecruiterLogin, backendUrl, setCompanyToken, setCompanyData } = useContext(AppContext)

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        
        if (isSubmitting) return;

        if (state === "Sign Up" && !isTextDataSubmitted) {
            if (!name.trim() || !email.trim() || !password.trim()) {
                toast.error('Please fill all fields');
                return;
            }
            if (password.length < 6) {
                toast.error('Password must be at least 6 characters');
                return;
            }
            return setIsTextDataSubmitted(true)
        }

        try {
            setIsSubmitting(true);

            if (state === "Login") {
                if (!email.trim() || !password.trim()) {
                    toast.error('Please fill all fields');
                    return;
                }

                const { data } = await axios.post(backendUrl + '/api/company/login', { email, password })
                
                if (data.success) {
                    setCompanyData(data.company)
                    setCompanyToken(data.token)
                    localStorage.setItem('companyToken', data.token)
                    setShowRecruiterLogin(false)
                    toast.success(data.message || 'Login successful')
                    navigate('/dashboard')
                } else {
                    toast.error(data.message)
                }
            } else {
                if (!image) {
                    toast.error('Please upload company logo');
                    return;
                }

                const formData = new FormData()
                formData.append('name', name)
                formData.append('password', password)
                formData.append('email', email)
                formData.append('image', image)

                const { data } = await axios.post(backendUrl + '/api/company/register', formData)

                if (data.success) {
                    setCompanyData(data.company)
                    setCompanyToken(data.token)
                    localStorage.setItem('companyToken', data.token)
                    setShowRecruiterLogin(false)
                    toast.success(data.message || 'Registration successful')
                    navigate('/dashboard')
                } else {
                    toast.error(data.message)
                }
            }
        }
        catch (error) {
            console.error('Auth error:', error);
            toast.error(error.response?.data?.message || error.message || 'An error occurred')
        }
        finally {
            setIsSubmitting(false);
        }
    }

    const resetForm = () => {
        setName('')
        setEmail('')
        setPassword('')
        setImage(false)
        setIsTextDataSubmitted(false)
    }

    const handleStateChange = (newState) => {
        setState(newState)
        resetForm()
    }

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    return (
        <div className='fixed inset-0 z-50 backdrop-blur-md bg-black/40 flex justify-center items-center p-4 animate-fade-in'>
            <form onSubmit={onSubmitHandler} className='relative bg-white p-8 sm:p-10 rounded-3xl text-slate-600 max-w-md w-full shadow-2xl animate-slide-up'>
                {/* Close button */}
                <button
                    type='button'
                    onClick={() => setShowRecruiterLogin(false)}
                    className='absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors'
                >
                    <img src={assets.cross_icon} alt="Close" className='w-4 h-4' />
                </button>

                {/* Header */}
                <div className='text-center mb-8'>
                    <h1 className='text-3xl text-gray-800 font-bold mb-2'>
                        Recruiter {state}
                    </h1>
                    <p className='text-sm text-gray-500'>
                        {state === 'Login' ? 'Welcome back! Sign in to continue' : 'Create your recruiter account'}
                    </p>
                </div>

                {state === "Sign Up" && isTextDataSubmitted ? (
                    <div className='flex flex-col items-center gap-4 my-8'>
                        <label htmlFor="image" className='cursor-pointer group'>
                            <div className='relative'>
                                <img 
                                    className='w-24 h-24 rounded-full border-4 border-gray-200 group-hover:border-blue-400 object-cover transition-all shadow-lg' 
                                    src={image ? URL.createObjectURL(image) : assets.upload_area} 
                                    alt="Upload company logo" 
                                />
                                <div className='absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                                    <span className='text-white text-xs font-semibold'>Change</span>
                                </div>
                            </div>
                            <input 
                                onChange={e => setImage(e.target.files[0])} 
                                type="file" 
                                id='image' 
                                hidden 
                                accept="image/*"
                            />
                        </label>
                        <p className='text-sm text-gray-600'>
                            Upload Company Logo <span className='text-red-500'>*</span>
                        </p>
                    </div>
                ) : (
                    <div className='space-y-4'>
                        {state !== 'Login' && (
                            <div className='relative'>
                                <div className='absolute left-4 top-1/2 -translate-y-1/2'>
                                    <img src={assets.person_icon} alt="" className='w-5 h-5 opacity-50' />
                                </div>
                                <input 
                                    className='w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-colors text-sm' 
                                    onChange={e => setName(e.target.value)} 
                                    value={name} 
                                    type="text" 
                                    placeholder='Company Name' 
                                    required 
                                />
                            </div>
                        )}

                        <div className='relative'>
                            <div className='absolute left-4 top-1/2 -translate-y-1/2'>
                                <img src={assets.email_icon} alt="" className='w-5 h-5 opacity-50' />
                            </div>
                            <input 
                                className='w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-colors text-sm' 
                                onChange={e => setEmail(e.target.value)} 
                                value={email} 
                                type="email" 
                                placeholder='Email Address' 
                                required 
                            />
                        </div>

                        <div className='relative'>
                            <div className='absolute left-4 top-1/2 -translate-y-1/2'>
                                <img src={assets.lock_icon} alt="" className='w-5 h-5 opacity-50' />
                            </div>
                            <input 
                                className='w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-colors text-sm' 
                                onChange={e => setPassword(e.target.value)} 
                                value={password} 
                                type="password" 
                                placeholder='Password' 
                                required 
                                minLength={6}
                            />
                        </div>
                    </div>
                )}

                {state === 'Login' && (
                    <div className='text-right mt-3'>
                        <button type='button' className='text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline'>
                            Forgot Password?
                        </button>
                    </div>
                )}

                <button 
                    type='submit'
                    className={`w-full text-white py-3.5 rounded-xl mt-6 font-semibold transition-all shadow-lg ${
                        isSubmitting 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl'
                    }`}
                    disabled={isSubmitting}
                > 
                    {isSubmitting ? 'Please wait...' : 
                     state === 'Login' ? 'Sign In' : 
                     isTextDataSubmitted ? 'Create Account' : 'Continue'}
                </button>

                <div className='mt-6 text-center'>
                    {state === 'Login' ? (
                        <p className='text-sm text-gray-600'>
                            Don't have an account? 
                            <button 
                                type='button'
                                className='text-blue-600 font-semibold hover:text-blue-700 ml-1 hover:underline' 
                                onClick={() => handleStateChange("Sign Up")}
                            >
                                Sign Up
                            </button>
                        </p>
                    ) : (
                        <p className='text-sm text-gray-600'>
                            Already have an account? 
                            <button 
                                type='button'
                                className='text-blue-600 font-semibold hover:text-blue-700 ml-1 hover:underline' 
                                onClick={() => handleStateChange("Login")}
                            >
                                Sign In
                            </button>
                        </p>
                    )}
                </div>
            </form>
        </div>
    )
}

export default RecruiterLogin