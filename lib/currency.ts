import * as Localization from 'expo-localization';

export interface PricingInfo {
  price: number;
  currency: string;
  symbol: string;
  countryCode: string;
  isOffer: boolean;
}

export const getLocalizedPricing = (): PricingInfo => {
  // In a real app, this would use Localization.region or a GeoIP service
  const countryCode = Localization.region || 'US';

  if (countryCode === 'IN') {
    return {
      price: 99,
      currency: 'INR',
      symbol: '₹',
      countryCode: 'IN',
      isOffer: true,
    };
  } else if (['FR', 'DE', 'IT', 'ES', 'NL', 'BE'].includes(countryCode)) {
    return {
      price: 9,
      currency: 'EUR',
      symbol: '€',
      countryCode: 'EU',
      isOffer: false,
    };
  } else {
    // Default to US pricing
    return {
      price: 9,
      currency: 'USD',
      symbol: '$',
      countryCode: 'US',
      isOffer: false,
    };
  }
};

/**
 * Helper to adjust price for 'other' countries based on basic purchasing power parity mock
 */
export const formatPrice = (info: PricingInfo) => {
  return `${info.symbol}${info.price}`;
};
