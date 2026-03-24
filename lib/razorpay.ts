export const getRazorpayOptions = (amount: number, currency: string, userProfile: any) => {
  return {
    description: 'SeniorCare Hub Premium Subscription',
    image: 'https://i.imgur.com/39go7qy.png', // Replace with your app logo URL
    currency: currency,
    key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    amount: amount * 100, // Razorpay expects amount in paise (1 INR = 100 paise)
    name: 'SeniorCare Hub',
    prefill: {
      email: userProfile?.email || '',
      contact: userProfile?.phone || '',
      name: userProfile?.full_name || 'Senior User',
    },
    theme: { color: '#6366F1' },
  };
};
