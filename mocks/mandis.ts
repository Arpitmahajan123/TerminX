export interface Mandi {
  id: string;
  name: string;
  nameHi: string;
  distance: number;
  transportCost: number;
  prices: MandiPrice[];
  isRecommended: boolean;
  reasonEn: string;
  reasonHi: string;
}

export interface MandiPrice {
  cropId: string;
  pricePerQuintal: number;
  trend: 'up' | 'down' | 'stable';
  netProfit: number;
}

export const mockMandis: Mandi[] = [
  {
    id: 'nashik',
    name: 'Nashik Mandi',
    nameHi: 'नासिक मंडी',
    distance: 15,
    transportCost: 80,
    prices: [
      { cropId: 'tomato', pricePerQuintal: 2200, trend: 'up', netProfit: 2120 },
      { cropId: 'onion', pricePerQuintal: 1800, trend: 'stable', netProfit: 1720 },
      { cropId: 'wheat', pricePerQuintal: 2400, trend: 'stable', netProfit: 2320 },
    ],
    isRecommended: false,
    reasonEn: 'Close but prices are average. Good if you need quick sale.',
    reasonHi: 'नज़दीक लेकिन कीमतें औसत हैं। जल्दी बेचने के लिए अच्छा।',
  },
  {
    id: 'nagpur',
    name: 'Nagpur Mandi',
    nameHi: 'नागपुर मंडी',
    distance: 45,
    transportCost: 250,
    prices: [
      { cropId: 'tomato', pricePerQuintal: 2800, trend: 'up', netProfit: 2550 },
      { cropId: 'onion', pricePerQuintal: 2100, trend: 'up', netProfit: 1850 },
      { cropId: 'wheat', pricePerQuintal: 2550, trend: 'up', netProfit: 2300 },
    ],
    isRecommended: true,
    reasonEn: 'Sell at Nagpur Mandi. Tomato price is ₹600 higher per quintal. Even after ₹250 transport cost, you make ₹430 more per quintal than Nashik.',
    reasonHi: 'नागपुर मंडी में बेचें। टमाटर की कीमत ₹600 प्रति क्विंटल अधिक है। ₹250 परिवहन खर्च के बाद भी, आप नासिक से ₹430 अधिक कमाएंगे।',
  },
  {
    id: 'pune',
    name: 'Pune Mandi',
    nameHi: 'पुणे मंडी',
    distance: 35,
    transportCost: 180,
    prices: [
      { cropId: 'tomato', pricePerQuintal: 2500, trend: 'stable', netProfit: 2320 },
      { cropId: 'onion', pricePerQuintal: 1950, trend: 'down', netProfit: 1770 },
      { cropId: 'wheat', pricePerQuintal: 2500, trend: 'stable', netProfit: 2320 },
    ],
    isRecommended: false,
    reasonEn: 'Moderate distance. Prices slightly above Nashik but below Nagpur.',
    reasonHi: 'मध्यम दूरी। कीमतें नासिक से थोड़ी अधिक लेकिन नागपुर से कम।',
  },
  {
    id: 'aurangabad',
    name: 'Sambhajinagar Mandi',
    nameHi: 'संभाजीनगर मंडी',
    distance: 50,
    transportCost: 300,
    prices: [
      { cropId: 'tomato', pricePerQuintal: 2650, trend: 'up', netProfit: 2350 },
      { cropId: 'onion', pricePerQuintal: 2200, trend: 'up', netProfit: 1900 },
      { cropId: 'wheat', pricePerQuintal: 2600, trend: 'stable', netProfit: 2300 },
    ],
    isRecommended: false,
    reasonEn: 'Good onion prices but long distance increases transport cost significantly.',
    reasonHi: 'प्याज़ की अच्छी कीमतें लेकिन लंबी दूरी से परिवहन लागत काफी बढ़ जाती है।',
  },
];

export interface Alert {
  id: string;
  type: 'harvest' | 'weather' | 'price' | 'spoilage';
  titleEn: string;
  titleHi: string;
  descEn: string;
  descHi: string;
  severity: 'info' | 'warning' | 'danger';
  timestamp: string;
}

export const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'weather',
    titleEn: 'Heavy Rain Alert',
    titleHi: 'भारी बारिश चेतावनी',
    descEn: 'Heavy rain expected on Wednesday. Harvest tomatoes before then.',
    descHi: 'बुधवार को भारी बारिश की संभावना। उससे पहले टमाटर काट लें।',
    severity: 'danger',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    type: 'price',
    titleEn: 'Tomato Prices Rising',
    titleHi: 'टमाटर की कीमतें बढ़ रही हैं',
    descEn: 'Tomato prices up 15% at Nagpur Mandi this week. Good time to sell.',
    descHi: 'इस सप्ताह नागपुर मंडी में टमाटर की कीमतें 15% बढ़ीं। बेचने का अच्छा समय।',
    severity: 'info',
    timestamp: '5 hours ago',
  },
  {
    id: '3',
    type: 'spoilage',
    titleEn: 'High Spoilage Risk',
    titleHi: 'खराबी का उच्च जोखिम',
    descEn: 'Your tomatoes have only 5 days shelf life. Consider storage options.',
    descHi: 'आपके टमाटरों की शेल्फ लाइफ केवल 5 दिन है। भंडारण विकल्पों पर विचार करें।',
    severity: 'warning',
    timestamp: '1 day ago',
  },
];
