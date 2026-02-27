/**
 * lang.js - Hindi/English i18n system for Kisan Simulation
 * Usage: import { t, setLanguage } from './lang';
 *        t('welcome')  →  returns text in current language
 */
import { createContext, useContext } from 'react';

const STRINGS = {
    en: {
        // App
        appName: 'Kisan Simulator',
        appTagline: 'Agricultural Market Simulation',
        appDesc: 'Plan your farming: choose crops, monitor weather, harvest, store, and sell for maximum profit.',

        // Setup
        trySimulation: '🚜 Try Simulation',
        setupTitle: 'Setup Your Farm',
        quickPresets: 'Quick Presets',
        smallFarm: '🌱 Small',
        mediumFarm: '🌿 Medium',
        largeFarm: '🌾 Large',
        yourLocation: 'Your Location',
        cityName: 'City / Village',
        cityHint: 'Real weather data will be fetched',
        yourParams: 'Your Parameters',
        startingMoney: 'Starting Capital (₹)',
        howMuchMoney: 'How much capital do you have?',
        farmSize: 'Farm Size (acres)',
        oneAcre: '1 acre ≈ 1000kg capacity',
        storageCapacity: 'Storage Capacity (kg)',
        warehouseSize: 'Your warehouse/godown size',
        farmSummary: 'Farm Summary',
        startingCapital: 'Starting Capital',
        location: 'Location',
        fields: 'Fields',
        capacityPerField: 'Capacity per Field',
        totalGrowCapacity: 'Total Grow Capacity',
        storage: 'Storage',
        realDataNote: '🌐 Real weather, exchange rates & crop prices',
        startSimulation: '🚜 Start Simulation',
        loadingData: '⏳ Loading data...',
        minRequired: 'Min: ₹10K capital, 0.5 acres, 500kg storage, city name',
        cityNotFound: 'City not found. Try another name.',
        networkError: 'Network error. Check internet and try again.',

        // Dashboard / Game
        yourFarm: 'Your Farm',
        fieldsCount: 'fields',
        tapToPlant: 'Tap empty field to plant • Tap ripe field to harvest',
        storageBarn: 'Storage / Godown',
        items: 'items',
        nextDay: 'Next Day ▶',
        day: 'Day',

        // Field
        empty: 'Empty',
        planted: 'Planted',
        growing: 'Growing',
        mature: 'Ready!',
        overripe: 'Overripe',
        dead: 'Spoiled',

        // Planting
        selectCrop: 'Select a Crop',
        season: 'Season',
        capacity: 'Capacity',
        maturityDays: 'Days to Mature',
        expectedYield: 'Expected Yield',
        seedCost: 'Seed Cost',
        estimatedProfit: 'Est. Profit',
        offSeason: 'Off Season',
        locked: 'Not Enough Capital',
        back: '← Back',

        // Storage
        storageEmpty: 'Storage Empty',
        harvestFirst: 'Harvest crops to fill storage',
        daysInStorage: 'days',
        quality: 'Quality',
        spoilage: 'Spoilage',

        // Market
        chooseItem: 'Choose Item to Sell',
        chooseMarket: 'Choose Market',
        selling: 'Selling',
        price: 'Price',
        revenue: 'Revenue',
        transportCost: 'Transport Cost',
        netProfit: 'Net Profit',
        sell: 'Sell →',
        demand: 'Demand',

        // Bank
        farmersBank: "Farmer's Bank",
        loanBalance: 'Loan Balance',
        interestRate: 'Interest Rate',
        maxLoan: 'Max Loan',
        takeLoan: 'Take Loan',
        repay: 'Repay',
        repayAll: 'All',
        lowRepWarning: 'Low reputation increases interest!',

        // Weather
        weather: 'Weather',
        past7Days: 'Past 7 Days',
        forecast7Days: '7-Day Forecast',
        weatherIntelligence: 'Weather Intelligence',
        nextWeek: 'Next Week',
        stormRisk: 'Storm Risk',
        heatwaveRisk: 'Heatwave Risk',
        growthImpact: 'Growth Impact',
        spoilageRisk: 'Spoilage Risk',
        transportRisk: 'Transport Risk',
        planting: 'Planting',
        harvest: 'Harvest',
        recommendation: 'Recommendation',
        fetchingWeather: 'Fetching real weather data...',
        realTimeData: 'Data from Open-Meteo API (real-time)',

        // Upgrades
        buyField: 'Buy Field',
        upgradeStorage: 'Upgrade Storage',

        // HUD
        exchangeRate: 'USD/INR',

        // Misc
        reset: 'Reset',
        refresh: 'Refresh',
        retry: 'Retry',
        welcome: 'Welcome! Tap an empty field to plant your first crop.',
        profitForecast: 'Profit Forecast',

        // Features list
        feat1: '🌱 6 Real Crops with Actual Growth Data',
        feat2: '☀️ Live Weather from Your Location',
        feat3: '🏪 3 Markets with Real Price Trends',
        feat4: '🚚 Transport & Spoilage Simulation',
        feat5: '💱 Live USD/INR Exchange Rate',
        feat6: '🏦 Loan & Credit System',
        goalText: '📊 Simulate farming decisions with real data',

        langSwitch: 'हिंदी',
    },

    hi: {
        // App
        appName: 'किसान सिम्युलेटर',
        appTagline: 'कृषि बाज़ार सिम्युलेशन',
        appDesc: 'अपनी खेती की योजना बनाएं: फसल चुनें, मौसम देखें, कटाई करें, भंडारण करें, और अधिकतम लाभ के लिए बेचें।',

        // Setup
        trySimulation: '🚜 सिम्युलेशन शुरू करें',
        setupTitle: 'अपना खेत सेटअप करें',
        quickPresets: 'तैयार विकल्प',
        smallFarm: '🌱 छोटा',
        mediumFarm: '🌿 मध्यम',
        largeFarm: '🌾 बड़ा',
        yourLocation: 'आपका स्थान',
        cityName: 'शहर / गाँव',
        cityHint: 'असली मौसम डेटा प्राप्त किया जाएगा',
        yourParams: 'आपके मापदंड',
        startingMoney: 'शुरुआती पूंजी (₹)',
        howMuchMoney: 'आपके पास कितनी पूंजी है?',
        farmSize: 'खेत का आकार (एकड़)',
        oneAcre: '1 एकड़ ≈ 1000 किलो क्षमता',
        storageCapacity: 'भंडारण क्षमता (किलो)',
        warehouseSize: 'आपके गोदाम का आकार',
        farmSummary: 'खेत का सारांश',
        startingCapital: 'शुरुआती पूंजी',
        location: 'स्थान',
        fields: 'खेत',
        capacityPerField: 'प्रति खेत क्षमता',
        totalGrowCapacity: 'कुल उगाने की क्षमता',
        storage: 'भंडारण',
        realDataNote: '🌐 असली मौसम, विनिमय दर और फसल मूल्य',
        startSimulation: '🚜 सिम्युलेशन शुरू करें',
        loadingData: '⏳ डेटा लोड हो रहा है...',
        minRequired: 'न्यूनतम: ₹10K पूंजी, 0.5 एकड़, 500 किलो भंडारण, शहर का नाम',
        cityNotFound: 'शहर नहीं मिला। दूसरा नाम डालें।',
        networkError: 'नेटवर्क त्रुटि। इंटरनेट जाँचें।',

        // Dashboard
        yourFarm: 'आपका खेत',
        fieldsCount: 'खेत',
        tapToPlant: 'खाली खेत पर टैप करें बोने के लिए • पकी फसल पर टैप करें काटने के लिए',
        storageBarn: 'भंडारण / गोदाम',
        items: 'सामान',
        nextDay: 'अगला दिन ▶',
        day: 'दिन',

        // Field
        empty: 'खाली',
        planted: 'बोया गया',
        growing: 'बढ़ रहा है',
        mature: 'तैयार!',
        overripe: 'अधपका',
        dead: 'खराब',

        // Planting
        selectCrop: 'फसल चुनें',
        season: 'मौसम',
        capacity: 'क्षमता',
        maturityDays: 'पकने के दिन',
        expectedYield: 'अपेक्षित उपज',
        seedCost: 'बीज लागत',
        estimatedProfit: 'अनुमानित लाभ',
        offSeason: 'गैर-मौसम',
        locked: 'पर्याप्त पूंजी नहीं',
        back: '← वापस',

        // Storage
        storageEmpty: 'भंडारण खाली',
        harvestFirst: 'भंडारण भरने के लिए फसल काटें',
        daysInStorage: 'दिन',
        quality: 'गुणवत्ता',
        spoilage: 'खराबी',

        // Market
        chooseItem: 'बेचने के लिए सामान चुनें',
        chooseMarket: 'बाज़ार चुनें',
        selling: 'बेच रहे हैं',
        price: 'मूल्य',
        revenue: 'आय',
        transportCost: 'ढुलाई खर्च',
        netProfit: 'शुद्ध लाभ',
        sell: 'बेचें →',
        demand: 'माँग',

        // Bank
        farmersBank: 'किसान बैंक',
        loanBalance: 'ऋण शेष',
        interestRate: 'ब्याज दर',
        maxLoan: 'अधिकतम ऋण',
        takeLoan: 'ऋण लें',
        repay: 'चुकाएं',
        repayAll: 'पूरा',
        lowRepWarning: 'कम प्रतिष्ठा से ब्याज बढ़ता है!',

        // Weather
        weather: 'मौसम',
        past7Days: 'पिछले 7 दिन',
        forecast7Days: '7-दिन का पूर्वानुमान',
        weatherIntelligence: 'मौसम विश्लेषण',
        nextWeek: 'अगला सप्ताह',
        stormRisk: 'तूफान का खतरा',
        heatwaveRisk: 'लू का खतरा',
        growthImpact: 'विकास पर प्रभाव',
        spoilageRisk: 'खराबी का खतरा',
        transportRisk: 'ढुलाई का खतरा',
        planting: 'बुवाई',
        harvest: 'कटाई',
        recommendation: 'सुझाव',
        fetchingWeather: 'असली मौसम डेटा प्राप्त हो रहा है...',
        realTimeData: 'Open-Meteo API से डेटा (रियल-टाइम)',

        // Upgrades
        buyField: 'खेत खरीदें',
        upgradeStorage: 'भंडारण बढ़ाएं',

        // HUD
        exchangeRate: 'USD/INR',

        // Misc
        reset: 'रीसेट',
        refresh: 'रिफ़्रेश',
        retry: 'पुनः प्रयास',
        welcome: 'स्वागत! बोने के लिए खाली खेत पर टैप करें।',
        profitForecast: 'लाभ पूर्वानुमान',

        // Features
        feat1: '🌱 6 असली फसलें वास्तविक डेटा के साथ',
        feat2: '☀️ आपके स्थान का लाइव मौसम',
        feat3: '🏪 3 बाज़ार असली कीमत रुझानों के साथ',
        feat4: '🚚 ढुलाई और खराबी सिम्युलेशन',
        feat5: '💱 लाइव USD/INR विनिमय दर',
        feat6: '🏦 ऋण और क्रेडिट प्रणाली',
        goalText: '📊 असली डेटा से खेती के फैसलों का सिम्युलेशन',

        langSwitch: 'English',
    },
};

// ─── Language Context ──────────────────────────────────

let currentLang = 'en';

export function setLanguage(lang) {
    currentLang = lang;
}

export function getLanguage() {
    return currentLang;
}

export function t(key) {
    return STRINGS[currentLang]?.[key] || STRINGS.en[key] || key;
}

export function isHindi() {
    return currentLang === 'hi';
}

export { STRINGS };
