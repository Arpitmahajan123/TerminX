export type Language = 'en' | 'hi';

// Hindi day and month names for date formatting
export const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_NAMES_HI = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
export const DAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_SHORT_HI = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
export const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_NAMES_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
export const MONTH_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_SHORT_HI = ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'];

/**
 * Format a Date object into a localized string.
 * @param date - The date to format
 * @param hindi - Whether to use Hindi
 * @param format - 'full' (गुरुवार, 27 जून 2025), 'short' (27 जून), 'dayMonth' (गुरु 27 जून)
 */
export function formatDate(date: Date, hindi: boolean, format: 'full' | 'short' | 'dayMonth' = 'full'): string {
  const d = date.getDate();
  const m = date.getMonth();
  const y = date.getFullYear();
  const day = date.getDay();

  if (hindi) {
    switch (format) {
      case 'full': return `${DAY_NAMES_HI[day]}, ${d} ${MONTH_NAMES_HI[m]} ${y}`;
      case 'short': return `${d} ${MONTH_NAMES_HI[m]}`;
      case 'dayMonth': return `${DAY_SHORT_HI[day]} ${d} ${MONTH_SHORT_HI[m]}`;
    }
  } else {
    switch (format) {
      case 'full': return `${DAY_NAMES_EN[day]}, ${d} ${MONTH_NAMES_EN[m]} ${y}`;
      case 'short': return `${d} ${MONTH_NAMES_EN[m]}`;
      case 'dayMonth': return `${DAY_SHORT_EN[day]} ${d} ${MONTH_SHORT_EN[m]}`;
    }
  }
}

/**
 * Get the next N dates starting from today.
 */
export function getUpcomingDates(count: number, startDate?: Date): Date[] {
  const start = startDate || new Date();
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

const translations = {
  en: {
    appName: 'AgriChain',
    dashboard: 'Home',
    harvest: 'Harvest',
    market: 'Market',
    storage: 'Storage',
    welcome: 'Welcome, Farmer',
    todayWeather: "Today's Weather",
    yourCrops: 'Your Crops',
    quickActions: 'Quick Actions',
    harvestAdvisor: 'Harvest Advisor',
    harvestWindow: 'Optimal Harvest Window',
    mandiMatchmaker: 'Mandi Matchmaker',
    spoilageRisk: 'Spoilage & Storage',
    whyThisRec: 'Why this recommendation?',
    bestMarket: 'Best Market',
    netProfit: 'Net Profit',
    transportCost: 'Transport Cost',
    pricePerQuintal: 'Price/Quintal',
    distance: 'Distance',
    shelfLife: 'Shelf Life Remaining',
    preservationTips: 'Preservation Tips',
    cost: 'Cost',
    effectiveness: 'Effectiveness',
    daysAdded: 'days added',
    harvestNow: 'Harvest Now',
    waitDays: 'Wait {days} Days',
    ready: 'Ready',
    urgent: 'Urgent',
    caution: 'Caution',
    good: 'Good',
    selectCrop: 'Select Your Crop',
    viewDetails: 'View Details',
    temperature: 'Temperature',
    humidity: 'Humidity',
    rainfall: 'Rainfall',
    wind: 'Wind',
    soilMoisture: 'Soil Moisture',
    region: 'Region',
    compareMarkets: 'Compare Markets',
    recommended: 'Recommended',
    sellHere: 'Sell Here',
    days: 'days',
    hours: 'hours',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    free: 'Free',
    alerts: 'Alerts',
    noAlerts: 'No alerts right now',
    language: 'Language',
    today: 'Today',
    aiAdvisor: 'AI Advisor',
    simulator: 'Simulator',
    optimal: 'Optimal',
    risk: 'Risk',
    confidence: 'Confidence',
    loading: 'Loading...',
    loadingAlerts: 'Loading alerts...',
    noCost: 'No cost',
    live: 'LIVE',
    onDevice: 'On-Device',
    loadingMandi: 'Loading mandi prices...',
    chatAssistant: 'Chat',
    askQuestion: 'Ask a question...',
    voiceMode: 'Voice Mode',
    comingSoon: 'Coming Soon',
  },
  hi: {
    appName: 'एग्रीचेन',
    dashboard: 'होम',
    harvest: 'कटाई',
    market: 'मंडी',
    storage: 'भंडारण',
    welcome: 'स्वागत है, किसान',
    todayWeather: 'आज का मौसम',
    yourCrops: 'आपकी फसलें',
    quickActions: 'त्वरित कार्य',
    harvestAdvisor: 'कटाई सलाहकार',
    harvestWindow: 'सर्वोत्तम कटाई समय',
    mandiMatchmaker: 'मंडी मैचमेकर',
    spoilageRisk: 'खराबी और भंडारण',
    whyThisRec: 'यह सलाह क्यों?',
    bestMarket: 'सबसे अच्छी मंडी',
    netProfit: 'शुद्ध लाभ',
    transportCost: 'परिवहन लागत',
    pricePerQuintal: 'मूल्य/क्विंटल',
    distance: 'दूरी',
    shelfLife: 'शेष शेल्फ लाइफ',
    preservationTips: 'संरक्षण सुझाव',
    cost: 'लागत',
    effectiveness: 'प्रभावशीलता',
    daysAdded: 'दिन जोड़े',
    harvestNow: 'अभी काटें',
    waitDays: '{days} दिन रुकें',
    ready: 'तैयार',
    urgent: 'तुरंत',
    caution: 'सावधानी',
    good: 'अच्छा',
    selectCrop: 'अपनी फसल चुनें',
    viewDetails: 'विवरण देखें',
    temperature: 'तापमान',
    humidity: 'नमी',
    rainfall: 'बारिश',
    wind: 'हवा',
    soilMoisture: 'मिट्टी की नमी',
    region: 'क्षेत्र',
    compareMarkets: 'मंडियों की तुलना',
    recommended: 'सुझावित',
    sellHere: 'यहाँ बेचें',
    days: 'दिन',
    hours: 'घंटे',
    high: 'उच्च',
    medium: 'मध्यम',
    low: 'कम',
    free: 'मुफ़्त',
    alerts: 'अलर्ट',
    noAlerts: 'अभी कोई अलर्ट नहीं',
    language: 'भाषा',
    today: 'आज',
    aiAdvisor: 'AI सलाहकार',
    simulator: 'सिम्युलेटर',
    optimal: 'सर्वोत्तम',
    risk: 'खतरा',
    confidence: 'विश्वसनीयता',
    loading: 'लोड हो रहा है...',
    loadingAlerts: 'अलर्ट लोड हो रहे हैं...',
    noCost: 'कोई लागत नहीं',
    live: 'लाइव',
    onDevice: 'ऑन-डिवाइस',
    loadingMandi: 'मंडी डेटा लोड हो रहा है...',
    chatAssistant: 'चैट',
    askQuestion: 'सवाल पूछें...',
    voiceMode: 'आवाज़ मोड',
    comingSoon: 'जल्द आ रहा है',
  },
} as const;

export default translations;
