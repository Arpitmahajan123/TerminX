export interface Crop {
  id: string;
  name: string;
  nameHi: string;
  icon: string;
  plantedDate: string;
  daysToHarvest: number;
  currentDay: number;
  status: 'growing' | 'ready' | 'urgent';
  harvestRecommendation: HarvestRecommendation;
  spoilageInfo: SpoilageInfo;
  imageUrl: string;
}

export interface HarvestRecommendation {
  action: 'harvest_now' | 'wait' | 'harvest_early';
  waitDays: number;
  confidence: number;
  reasonEn: string;
  reasonHi: string;
  factors: HarvestFactor[];
}

export interface HarvestFactor {
  name: string;
  nameHi: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  descEn: string;
  descHi: string;
}

export interface SpoilageInfo {
  shelfLifeDays: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasonEn: string;
  reasonHi: string;
  preservationTips: PreservationTip[];
}

export interface PreservationTip {
  titleEn: string;
  titleHi: string;
  descEn: string;
  descHi: string;
  cost: number;
  daysAdded: number;
  effectiveness: 'high' | 'medium' | 'low';
}

export const mockCrops: Crop[] = [
  {
    id: 'tomato',
    name: 'Tomato',
    nameHi: 'टमाटर',
    icon: '🍅',
    plantedDate: '2026-01-10',
    daysToHarvest: 75,
    currentDay: 70,
    status: 'urgent',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400',
    harvestRecommendation: {
      action: 'harvest_now',
      waitDays: 0,
      confidence: 92,
      reasonEn: 'Harvest your tomatoes by Tuesday. Heavy rain is expected on Wednesday which will damage ripe fruit and increase fungal risk. Current ripeness is at 85%.',
      reasonHi: 'मंगलवार तक अपने टमाटर काट लें। बुधवार को भारी बारिश की संभावना है जो पके फलों को नुकसान पहुंचाएगी और फफूंद का खतरा बढ़ाएगी। वर्तमान पकाव 85% है।',
      factors: [
        { name: 'Weather Forecast', nameHi: 'मौसम पूर्वानुमान', impact: 'negative', weight: 0.45, descEn: 'Heavy rain expected in 2 days', descHi: '2 दिनों में भारी बारिश की संभावना' },
        { name: 'Crop Ripeness', nameHi: 'फसल पकाव', impact: 'positive', weight: 0.30, descEn: 'Ripeness at 85% — ready for harvest', descHi: 'पकाव 85% — कटाई के लिए तैयार' },
        { name: 'Soil Moisture', nameHi: 'मिट्टी की नमी', impact: 'neutral', weight: 0.15, descEn: 'Soil moisture at 45% — adequate', descHi: 'मिट्टी की नमी 45% — पर्याप्त' },
        { name: 'Market Price Trend', nameHi: 'बाज़ार मूल्य रुझान', impact: 'positive', weight: 0.10, descEn: 'Tomato prices rising this week', descHi: 'इस सप्ताह टमाटर की कीमतें बढ़ रही हैं' },
      ],
    },
    spoilageInfo: {
      shelfLifeDays: 5,
      riskLevel: 'high',
      reasonEn: 'High humidity (72%) and temperature (34°C) will accelerate spoilage. Tomatoes will start softening in 3 days without intervention.',
      reasonHi: 'अधिक नमी (72%) और तापमान (34°C) से खराबी तेज़ होगी। बिना उपाय किए टमाटर 3 दिनों में नरम होने लगेंगे।',
      preservationTips: [
        { titleEn: 'Shade & ventilation', titleHi: 'छाया और हवा', descEn: 'Spread tomatoes in single layer under shade with good airflow', descHi: 'टमाटरों को छाया में एक परत में हवादार जगह फैलाएं', cost: 0, daysAdded: 2, effectiveness: 'medium' },
        { titleEn: 'Bamboo raised bed', titleHi: 'बांस की ऊंची बेड', descEn: 'Place on raised bamboo platform to reduce ground moisture contact', descHi: 'ज़मीन की नमी से बचाने के लिए बांस के ऊंचे प्लेटफ़ॉर्म पर रखें', cost: 0, daysAdded: 3, effectiveness: 'medium' },
        { titleEn: 'Zero-energy cool chamber', titleHi: 'शून्य-ऊर्जा शीत कक्ष', descEn: 'Build with bricks, sand and water — keeps produce 10-15°C cooler', descHi: 'ईंट, रेत और पानी से बनाएं — उपज को 10-15°C ठंडा रखता है', cost: 500, daysAdded: 7, effectiveness: 'high' },
        { titleEn: 'Local cold storage', titleHi: 'स्थानीय कोल्ड स्टोरेज', descEn: 'Rent ventilated cold storage at nearby facility', descHi: 'नज़दीकी सुविधा में वातानुकूलित कोल्ड स्टोरेज किराये पर लें', cost: 300, daysAdded: 15, effectiveness: 'high' },
      ],
    },
  },
  {
    id: 'onion',
    name: 'Onion',
    nameHi: 'प्याज़',
    icon: '🧅',
    plantedDate: '2025-12-15',
    daysToHarvest: 90,
    currentDay: 78,
    status: 'growing',
    imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400',
    harvestRecommendation: {
      action: 'wait',
      waitDays: 5,
      confidence: 88,
      reasonEn: 'Your onions need 5 more days. The bulbs are still sizing up. Weather is clear for the next 4 days — perfect growing conditions. Harvest on Sunday for maximum weight.',
      reasonHi: 'आपके प्याज़ को 5 और दिन चाहिए। कंद अभी बड़े हो रहे हैं। अगले 4 दिन मौसम साफ है — उगने के लिए बेहतरीन। अधिकतम वज़न के लिए रविवार को काटें।',
      factors: [
        { name: 'Bulb Maturity', nameHi: 'कंद परिपक्वता', impact: 'negative', weight: 0.40, descEn: 'Bulbs at 75% size — need more time', descHi: 'कंद 75% आकार पर — और समय चाहिए' },
        { name: 'Weather Window', nameHi: 'मौसम खिड़की', impact: 'positive', weight: 0.35, descEn: 'Clear weather for next 4 days', descHi: 'अगले 4 दिन साफ मौसम' },
        { name: 'Soil Condition', nameHi: 'मिट्टी की स्थिति', impact: 'positive', weight: 0.15, descEn: 'Good drainage, no waterlogging risk', descHi: 'अच्छी जल निकासी, जलभराव का खतरा नहीं' },
        { name: 'Price Trend', nameHi: 'मूल्य रुझान', impact: 'neutral', weight: 0.10, descEn: 'Onion prices stable this week', descHi: 'इस सप्ताह प्याज़ की कीमतें स्थिर' },
      ],
    },
    spoilageInfo: {
      shelfLifeDays: 18,
      riskLevel: 'medium',
      reasonEn: 'Onions will start rotting in 4 days if stored in high humidity. Current humidity is 72% which is above the safe limit of 65%.',
      reasonHi: 'अधिक नमी में प्याज़ 4 दिनों में सड़ने लगेंगे। वर्तमान नमी 72% है जो सुरक्षित सीमा 65% से अधिक है।',
      preservationTips: [
        { titleEn: 'Curing in sunlight', titleHi: 'धूप में सुखाना', descEn: 'Dry onions in direct sun for 2-3 days to harden outer skin', descHi: 'बाहरी छिलका सख्त करने के लिए 2-3 दिन धूप में सुखाएं', cost: 0, daysAdded: 10, effectiveness: 'high' },
        { titleEn: 'Bamboo raised bed', titleHi: 'बांस की ऊंची बेड', descEn: 'Store on raised bamboo platform for airflow', descHi: 'हवा के लिए बांस के ऊंचे प्लेटफ़ॉर्म पर रखें', cost: 0, daysAdded: 5, effectiveness: 'medium' },
        { titleEn: 'Ventilated storage shed', titleHi: 'हवादार भंडार गृह', descEn: 'Use a well-ventilated local storage structure', descHi: 'अच्छी हवादार स्थानीय भंडारण संरचना का उपयोग करें', cost: 200, daysAdded: 20, effectiveness: 'high' },
      ],
    },
  },
  {
    id: 'wheat',
    name: 'Wheat',
    nameHi: 'गेहूँ',
    icon: '🌾',
    plantedDate: '2025-11-20',
    daysToHarvest: 120,
    currentDay: 105,
    status: 'growing',
    imageUrl: 'https://images.unsplash.com/photo-1437252611977-07f74518abd7?w=400',
    harvestRecommendation: {
      action: 'wait',
      waitDays: 12,
      confidence: 85,
      reasonEn: 'Wheat grains are still filling. Wait 12 more days for maximum grain weight. Monitor for any unexpected rain after day 10.',
      reasonHi: 'गेहूं के दाने अभी भर रहे हैं। अधिकतम दाने के वज़न के लिए 12 और दिन रुकें। 10वें दिन के बाद अप्रत्याशित बारिश पर नज़र रखें।',
      factors: [
        { name: 'Grain Fill Stage', nameHi: 'दाना भराव चरण', impact: 'negative', weight: 0.50, descEn: 'Grains at 80% fill — early harvest reduces yield', descHi: 'दाने 80% भरे — जल्दी कटाई से उपज कम होगी' },
        { name: 'Weather Outlook', nameHi: 'मौसम दृष्टिकोण', impact: 'positive', weight: 0.30, descEn: 'Dry conditions expected for 10 days', descHi: '10 दिनों तक सूखा मौसम अपेक्षित' },
        { name: 'Pest Risk', nameHi: 'कीट जोखिम', impact: 'neutral', weight: 0.20, descEn: 'Low pest pressure currently', descHi: 'वर्तमान में कम कीट दबाव' },
      ],
    },
    spoilageInfo: {
      shelfLifeDays: 60,
      riskLevel: 'low',
      reasonEn: 'Wheat has long shelf life when properly dried. Ensure moisture content is below 12% before storage.',
      reasonHi: 'सही तरीके से सुखाने पर गेहूं की शेल्फ लाइफ लंबी होती है। भंडारण से पहले नमी 12% से कम सुनिश्चित करें।',
      preservationTips: [
        { titleEn: 'Sun drying', titleHi: 'धूप में सुखाना', descEn: 'Dry in sun until moisture below 12%', descHi: 'नमी 12% से कम होने तक धूप में सुखाएं', cost: 0, daysAdded: 30, effectiveness: 'high' },
        { titleEn: 'Jute bag storage', titleHi: 'जूट बैग भंडारण', descEn: 'Store in clean jute bags on raised platform', descHi: 'ऊंचे प्लेटफ़ॉर्म पर साफ जूट बैग में रखें', cost: 50, daysAdded: 45, effectiveness: 'high' },
      ],
    },
  },
  {
    id: 'rice',
    name: 'Rice (Paddy)',
    nameHi: 'धान (चावल)',
    icon: '🌾',
    plantedDate: '2025-07-01',
    daysToHarvest: 130,
    currentDay: 120,
    status: 'growing',
    imageUrl: 'https://images.unsplash.com/photo-1536304993881-90592a3fcdca?w=400',
    harvestRecommendation: {
      action: 'wait',
      waitDays: 10,
      confidence: 82,
      reasonEn: 'Paddy grains are 90% filled. Wait 10 more days for maximum yield. Ensure fields are drained 7 days before harvest.',
      reasonHi: 'धान के दाने 90% भरे हैं। अधिकतम उपज के लिए 10 और दिन रुकें। कटाई से 7 दिन पहले खेत सूखा कर दें।',
      factors: [
        { name: 'Grain Fill', nameHi: 'दाना भराव', impact: 'negative', weight: 0.45, descEn: 'Grains 90% filled — needs more time', descHi: 'दाने 90% भरे — और समय चाहिए' },
        { name: 'Field Drainage', nameHi: 'खेत जल निकासी', impact: 'neutral', weight: 0.30, descEn: 'Drain fields before harvest for easy operation', descHi: 'आसान कटाई के लिए खेत सूखा करें' },
        { name: 'Weather', nameHi: 'मौसम', impact: 'positive', weight: 0.25, descEn: 'Clear weather ahead — good for drying', descHi: 'आगे साफ मौसम — सुखाने के लिए अच्छा' },
      ],
    },
    spoilageInfo: {
      shelfLifeDays: 45,
      riskLevel: 'low',
      reasonEn: 'Paddy stores well when dried to 14% moisture. Higher humidity will promote fungal growth.',
      reasonHi: '14% नमी तक सुखाने पर धान अच्छे से स्टोर होता है। अधिक नमी से फफूंद लगेगी।',
      preservationTips: [
        { titleEn: 'Sun drying', titleHi: 'धूप में सुखाना', descEn: 'Dry paddy to 14% moisture on concrete floor', descHi: 'कंक्रीट फर्श पर 14% नमी तक सुखाएं', cost: 0, daysAdded: 30, effectiveness: 'high' },
        { titleEn: 'Hermetic storage', titleHi: 'वायुरुद्ध भंडारण', descEn: 'Use hermetic bags to prevent insect damage', descHi: 'कीट नुकसान रोकने के लिए वायुरुद्ध बैग उपयोग करें', cost: 150, daysAdded: 60, effectiveness: 'high' },
      ],
    },
  },
  {
    id: 'soybean',
    name: 'Soybean',
    nameHi: 'सोयाबीन',
    icon: '🫘',
    plantedDate: '2025-06-25',
    daysToHarvest: 100,
    currentDay: 88,
    status: 'growing',
    imageUrl: 'https://images.unsplash.com/photo-1599420186946-7c0ab2e0f07a?w=400',
    harvestRecommendation: {
      action: 'wait',
      waitDays: 12,
      confidence: 80,
      reasonEn: 'Soybean pods are yellowing but not fully mature. Wait 12 days. Harvest when 95% pods turn brown. Early harvest reduces oil content.',
      reasonHi: 'सोयाबीन की फलियां पीली हो रही हैं लेकिन पूरी पकी नहीं। 12 दिन रुकें। 95% फलियां भूरी होने पर काटें।',
      factors: [
        { name: 'Pod Maturity', nameHi: 'फली परिपक्वता', impact: 'negative', weight: 0.50, descEn: 'Pods 75% mature — needs more time', descHi: 'फलियां 75% पकी — और समय चाहिए' },
        { name: 'Oil Content', nameHi: 'तेल सामग्री', impact: 'negative', weight: 0.30, descEn: 'Oil content increases in final 2 weeks', descHi: 'अंतिम 2 हफ्तों में तेल सामग्री बढ़ती है' },
        { name: 'MSP Advantage', nameHi: 'MSP लाभ', impact: 'positive', weight: 0.20, descEn: 'MSP ₹4,892/q — good government support', descHi: 'MSP ₹4,892/क्विं — अच्छा सरकारी समर्थन' },
      ],
    },
    spoilageInfo: {
      shelfLifeDays: 30,
      riskLevel: 'medium',
      reasonEn: 'Soybeans are prone to moisture absorption. Store in dry, cool place. Fungal risk increases above 12% moisture.',
      reasonHi: 'सोयाबीन नमी सोखती है। सूखी, ठंडी जगह रखें। 12% नमी से ऊपर फफूंद का खतरा बढ़ता है।',
      preservationTips: [
        { titleEn: 'Proper drying', titleHi: 'उचित सुखाना', descEn: 'Dry to 10-12% moisture before storage', descHi: 'भंडारण से पहले 10-12% नमी तक सुखाएं', cost: 0, daysAdded: 20, effectiveness: 'high' },
        { titleEn: 'Metal bin storage', titleHi: 'धातु बिन भंडारण', descEn: 'Store in clean, sealed metal bins', descHi: 'साफ, सीलबंद धातु बिन में रखें', cost: 100, daysAdded: 45, effectiveness: 'high' },
      ],
    },
  },
  {
    id: 'cotton',
    name: 'Cotton',
    nameHi: 'कपास',
    icon: '🏵️',
    plantedDate: '2025-06-15',
    daysToHarvest: 160,
    currentDay: 140,
    status: 'growing',
    imageUrl: 'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?w=400',
    harvestRecommendation: {
      action: 'wait',
      waitDays: 15,
      confidence: 78,
      reasonEn: 'Cotton bolls are opening but 60% are still green. Pick in 2-3 rounds as bolls open. First pick in 15 days. MSP is ₹7,121/quintal.',
      reasonHi: 'कपास की बॉल्स खुल रही हैं लेकिन 60% अभी हरी हैं। बॉल्स खुलने पर 2-3 बार चुनें। पहली चुनाई 15 दिन में। MSP ₹7,121/क्विंटल।',
      factors: [
        { name: 'Boll Opening', nameHi: 'बॉल खुलना', impact: 'negative', weight: 0.40, descEn: '40% bolls open — more opening expected', descHi: '40% बॉल्स खुली — और खुलने की उम्मीद' },
        { name: 'Quality Grade', nameHi: 'गुणवत्ता ग्रेड', impact: 'positive', weight: 0.35, descEn: 'Wait for dry bolls — better staple length', descHi: 'सूखी बॉल्स का इंतज़ार — बेहतर स्टेपल लंबाई' },
        { name: 'Market Rate', nameHi: 'बाज़ार दर', impact: 'positive', weight: 0.25, descEn: 'Cotton prices above MSP — good returns', descHi: 'कपास कीमतें MSP से ऊपर — अच्छा रिटर्न' },
      ],
    },
    spoilageInfo: {
      shelfLifeDays: 90,
      riskLevel: 'low',
      reasonEn: 'Cotton stores well in dry conditions. Avoid moisture exposure which causes discoloration and reduces grade.',
      reasonHi: 'कपास सूखी जगह अच्छे से स्टोर होती है। नमी से बचें — रंग खराब होता है और ग्रेड गिरता है।',
      preservationTips: [
        { titleEn: 'Covered storage', titleHi: 'ढका भंडारण', descEn: 'Store under waterproof cover on raised platform', descHi: 'ऊंचे प्लेटफ़ॉर्म पर पानीरोधक कवर से ढकें', cost: 0, daysAdded: 30, effectiveness: 'high' },
        { titleEn: 'CCI/APMC sale', titleHi: 'CCI/APMC बिक्री', descEn: 'Register with CCI for MSP procurement', descHi: 'MSP खरीद के लिए CCI में पंजीकरण करें', cost: 0, daysAdded: 0, effectiveness: 'high' },
      ],
    },
  },
  {
    id: 'sugarcane',
    name: 'Sugarcane',
    nameHi: 'गन्ना',
    icon: '🎋',
    plantedDate: '2025-02-15',
    daysToHarvest: 330,
    currentDay: 310,
    status: 'growing',
    imageUrl: 'https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?w=400',
    harvestRecommendation: {
      action: 'wait',
      waitDays: 20,
      confidence: 75,
      reasonEn: 'Sugarcane approaching maturity. Sugar content (sucrose %) increases in last month. Coordinate with sugar factory for crushing schedule. FRP is ₹315/quintal.',
      reasonHi: 'गन्ना परिपक्वता के करीब। अंतिम महीने में चीनी (सुक्रोज %) बढ़ती है। पेराई शेड्यूल के लिए चीनी मिल से समन्वय करें। FRP ₹315/क्विंटल।',
      factors: [
        { name: 'Sugar Content', nameHi: 'चीनी सामग्री', impact: 'positive', weight: 0.45, descEn: 'Sucrose increasing — wait for peak', descHi: 'सुक्रोज बढ़ रही — चरम की प्रतीक्षा करें' },
        { name: 'Factory Schedule', nameHi: 'फैक्ट्री शेड्यूल', impact: 'neutral', weight: 0.30, descEn: 'Confirm crushing slot with factory', descHi: 'फैक्ट्री से पेराई स्लॉट कन्फर्म करें' },
        { name: 'FRP Rate', nameHi: 'FRP दर', impact: 'positive', weight: 0.25, descEn: 'FRP ₹315/q — government guaranteed', descHi: 'FRP ₹315/क्विं — सरकार गारंटी' },
      ],
    },
    spoilageInfo: {
      shelfLifeDays: 3,
      riskLevel: 'high',
      reasonEn: 'Cut sugarcane loses 1-2% sugar per day. Must be crushed within 24-72 hours of cutting for maximum recovery.',
      reasonHi: 'कटा गन्ना रोज़ 1-2% चीनी खोता है। अधिकतम रिकवरी के लिए कटाई के 24-72 घंटे में पेरें।',
      preservationTips: [
        { titleEn: 'Quick transport', titleHi: 'तेज़ परिवहन', descEn: 'Transport to sugar factory within 24 hours of cutting', descHi: 'कटाई के 24 घंटे में चीनी मिल पहुंचाएं', cost: 200, daysAdded: 0, effectiveness: 'high' },
        { titleEn: 'Shade storage', titleHi: 'छाया भंडारण', descEn: 'Keep cut cane in shade to slow sugar loss', descHi: 'चीनी हानि कम करने के लिए कटे गन्ने को छाया में रखें', cost: 0, daysAdded: 1, effectiveness: 'medium' },
      ],
    },
  },
];
