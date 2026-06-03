const express = require('express');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');
const User = require('../models/User');

const router = express.Router();

// Analyze solar potential based on location
router.post('/solar-analysis', auth, async (req, res) => {
  try {
    const { latitude, longitude, sendEmail = false } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    // Get location information (simplified)
    const location = await getLocationInfo(latitude, longitude);
    
    // Analyze solar potential
    const solarAnalysis = analyzeSolarPotential(latitude, longitude, location);
    
    // Send email recommendation if requested
    if (sendEmail) {
      try {
        const user = await User.findById(req.user.userId);
        if (user) {
          await emailService.sendSolarRecommendation(user.email, {
            location,
            ...solarAnalysis
          });
        }
      } catch (emailError) {
        console.error('Failed to send solar recommendation email:', emailError);
      }
    }
    
    res.json({
      location,
      solarAnalysis,
      recommendations: generateSolarRecommendations(solarAnalysis),
      analysis_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Solar analysis error:', error);
    res.status(500).json({ message: 'Error analyzing solar potential' });
  }
});

// Get nearby solar installations (mock data)
router.get('/nearby-installations', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;
    
    // Mock nearby installations data
    const nearbyInstallations = [
      {
        id: 1,
        location: { latitude: parseFloat(latitude) + 0.01, longitude: parseFloat(longitude) + 0.01 },
        capacity: '5kW',
        type: 'Residential',
        yearInstalled: 2023,
        annualGeneration: '7500 kWh',
        owner: 'Residential User',
        distance: '1.2 km'
      },
      {
        id: 2,
        location: { latitude: parseFloat(latitude) - 0.02, longitude: parseFloat(longitude) + 0.015 },
        capacity: '10kW',
        type: 'Commercial',
        yearInstalled: 2022,
        annualGeneration: '15000 kWh',
        owner: 'Local Business',
        distance: '2.8 km'
      },
      {
        id: 3,
        location: { latitude: parseFloat(latitude) + 0.03, longitude: parseFloat(longitude) - 0.01 },
        capacity: '3kW',
        type: 'Residential',
        yearInstalled: 2024,
        annualGeneration: '4500 kWh',
        owner: 'Residential User',
        distance: '3.5 km'
      }
    ];
    
    res.json({
      installations: nearbyInstallations,
      totalInstallations: nearbyInstallations.length,
      searchRadius: radius,
      center: { latitude, longitude }
    });
    
  } catch (error) {
    console.error('Nearby installations error:', error);
    res.status(500).json({ message: 'Error fetching nearby installations' });
  }
});

// Helper functions
async function getLocationInfo(latitude, longitude) {
  // Simplified location detection for Indian cities
  const indianCities = [
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
    { name: 'Delhi', lat: 28.7041, lng: 77.1025, state: 'Delhi' },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, state: 'Telangana' },
    { name: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, state: 'Gujarat' }
  ];
  
  // Find closest city
  let closestCity = indianCities[0];
  let minDistance = calculateDistance(latitude, longitude, closestCity.lat, closestCity.lng);
  
  for (const city of indianCities) {
    const distance = calculateDistance(latitude, longitude, city.lat, city.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestCity = city;
    }
  }
  
  return {
    latitude,
    longitude,
    city: closestCity.name,
    state: closestCity.state,
    country: 'India',
    address: `${closestCity.name}, ${closestCity.state}, India`
  };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function analyzeSolarPotential(latitude, longitude, location) {
  // Solar irradiance estimation for India
  const solarIrradiance = estimateSolarIrradiance(latitude, location.state);
  
  // System specifications (5kW residential system)
  const systemCapacity = 5; // kW
  const panelEfficiency = 0.20; // 20%
  const systemEfficiency = 0.85; // 85% (inverter losses, etc.)
  
  // Calculate generation
  const dailyGeneration = solarIrradiance * systemCapacity * systemEfficiency;
  const annualGeneration = dailyGeneration * 365;
  
  // Cost calculations (2024 Indian prices)
  const costPerKW = 60000; // ₹60,000 per kW (after subsidy)
  const installationCost = systemCapacity * costPerKW;
  
  // Savings calculations
  const electricityRate = 7; // ₹7 per kWh average
  const annualSavings = annualGeneration * electricityRate;
  const paybackPeriod = installationCost / annualSavings;
  
  // Suitability score (0-100)
  const suitabilityScore = Math.min(100, Math.max(0, (solarIrradiance - 3) * 20));
  
  return {
    suitabilityScore: Math.round(suitabilityScore),
    solarIrradiance: Math.round(solarIrradiance * 100) / 100,
    systemCapacity,
    dailyGeneration: Math.round(dailyGeneration * 100) / 100,
    annualGeneration: Math.round(annualGeneration),
    installationCost: Math.round(installationCost),
    annualSavings: Math.round(annualSavings),
    paybackPeriod: Math.round(paybackPeriod * 10) / 10,
    co2Reduction: Math.round(annualGeneration * 0.82), // 0.82 kg CO2 per kWh in India
    monthlyGeneration: Math.round(annualGeneration / 12)
  };
}

function estimateSolarIrradiance(latitude, state) {
  // Solar irradiance data for Indian states (kWh/m²/day)
  const stateIrradiance = {
    'Rajasthan': 5.8,
    'Gujarat': 5.6,
    'Maharashtra': 5.2,
    'Karnataka': 5.4,
    'Andhra Pradesh': 5.5,
    'Tamil Nadu': 5.3,
    'Telangana': 5.4,
    'Madhya Pradesh': 5.1,
    'Haryana': 5.0,
    'Punjab': 4.9,
    'Delhi': 4.8,
    'Uttar Pradesh': 4.7,
    'West Bengal': 4.5,
    'Odisha': 4.8,
    'Jharkhand': 4.6,
    'Bihar': 4.5,
    'Assam': 4.2,
    'Kerala': 4.8
  };
  
  const baseIrradiance = stateIrradiance[state] || 5.0;
  
  // Adjust for latitude (closer to equator = higher irradiance)
  const latitudeAdjustment = (25 - Math.abs(latitude)) * 0.02;
  
  return Math.max(3.5, Math.min(6.5, baseIrradiance + latitudeAdjustment));
}

function generateSolarRecommendations(analysis) {
  const recommendations = [];
  
  if (analysis.suitabilityScore >= 80) {
    recommendations.push({
      priority: 'high',
      title: 'Excellent Solar Potential',
      description: `Your location has outstanding solar potential with ${analysis.suitabilityScore}/100 score. Installing solar panels is highly recommended.`,
      action: 'Proceed with solar installation immediately',
      savings: `Save ₹${analysis.annualSavings.toLocaleString('en-IN')} annually`
    });
  } else if (analysis.suitabilityScore >= 60) {
    recommendations.push({
      priority: 'medium',
      title: 'Good Solar Potential',
      description: `Your location has good solar potential. Solar installation will provide significant benefits.`,
      action: 'Consider solar installation with proper planning',
      savings: `Save ₹${analysis.annualSavings.toLocaleString('en-IN')} annually`
    });
  } else if (analysis.suitabilityScore >= 40) {
    recommendations.push({
      priority: 'low',
      title: 'Moderate Solar Potential',
      description: `Solar installation is possible but may require additional considerations like battery storage.`,
      action: 'Detailed site assessment recommended',
      savings: `Save ₹${analysis.annualSavings.toLocaleString('en-IN')} annually`
    });
  } else {
    recommendations.push({
      priority: 'low',
      title: 'Limited Solar Potential',
      description: `Your location has limited solar potential. Consider other energy efficiency measures first.`,
      action: 'Focus on energy efficiency improvements',
      savings: 'Consider alternative renewable options'
    });
  }
  
  // Government subsidy recommendation
  recommendations.push({
    priority: 'high',
    title: 'Government Subsidies Available',
    description: `Take advantage of 40% central subsidy for up to 3kW and additional state subsidies.`,
    action: 'Apply through National Portal for Rooftop Solar',
    savings: `Reduce installation cost by ₹${Math.round(analysis.installationCost * 0.4).toLocaleString('en-IN')}`
  });
  
  return recommendations;
}

module.exports = router;