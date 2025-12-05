const apikey = "505839d65c8ad0d5c4d7b3665c9dd403";
let currentUnit = 'C'; // 'C' or 'F'
let currentWeatherData = null;
let currentForecastData = null;

// DOM Elements
const cityEl = document.getElementById('city');
const tempEl = document.getElementById('temperature');
const imgEl = document.getElementById('img');
const cloudsEl = document.getElementById('clouds');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const pressureEl = document.getElementById('pressure');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const inputEl = document.getElementById('input');
const searchBtn = document.getElementById('search');
const unitToggleEl = document.getElementById('unit-toggle');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const hourlyContainer = document.querySelector('.templist');
const dailyContainer = document.querySelector('.weekF');

// Event Listeners
window.addEventListener("load", () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            getWeatherByLocation(lat, lon);
        }, () => {
            // Default to a city if geolocation is denied
            getWeatherByCity('New York');
        });
    } else {
        getWeatherByCity('New York');
    }
});

searchBtn.addEventListener('click', () => {
    const city = inputEl.value;
    if (city) getWeatherByCity(city);
});

inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = inputEl.value;
        if (city) getWeatherByCity(city);
    }
});

unitToggleEl.addEventListener('click', toggleUnit);

// Functions

async function getWeatherByLocation(lat, lon) {
    showLoading(true);
    hideError();
    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apikey}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apikey}`;

        const [weatherRes, forecastRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        if (!weatherRes.ok || !forecastRes.ok) throw new Error('Failed to fetch data');

        currentWeatherData = await weatherRes.json();
        currentForecastData = await forecastRes.json();

        updateUI();
    } catch (err) {
        showError(err.message);
    } finally {
        showLoading(false);
    }
}

async function getWeatherByCity(city) {
    showLoading(true);
    hideError();
    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apikey}`;
        const weatherRes = await fetch(weatherUrl);
        
        if (!weatherRes.ok) throw new Error('City not found');
        
        currentWeatherData = await weatherRes.json();
        
        // Use coordinates from weather data to get forecast (more accurate)
        const { lat, lon } = currentWeatherData.coord;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apikey}`;
        const forecastRes = await fetch(forecastUrl);
        
        if (!forecastRes.ok) throw new Error('Forecast data unavailable');
        
        currentForecastData = await forecastRes.json();

        updateUI();
    } catch (err) {
        showError(err.message);
    } finally {
        showLoading(false);
    }
}

function updateUI() {
    if (!currentWeatherData || !currentForecastData) return;

    // Update Current Weather
    const { name, sys, main, weather, wind, dt, timezone } = currentWeatherData;
    
    cityEl.innerText = `${name}, ${sys.country}`;
    tempEl.innerText = formatTemp(main.temp);
    cloudsEl.innerText = weather[0].description;
    imgEl.src = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
    
    humidityEl.innerText = `${main.humidity}%`;
    windEl.innerText = `${wind.speed} m/s`;
    pressureEl.innerText = `${main.pressure} hPa`;
    
    sunriseEl.innerText = formatTime(sys.sunrise, timezone);
    sunsetEl.innerText = formatTime(sys.sunset, timezone);

    // Update Background
    updateBackground(weather[0].main);

    // Update Hourly Forecast (Next 5 items -> 15 hours)
    hourlyContainer.innerHTML = '';
    currentForecastData.list.slice(0, 5).forEach(item => {
        const card = document.createElement('div');
        card.className = 'next';
        card.innerHTML = `
            <p class="time">${formatTime(item.dt, timezone)}</p>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="icon" width="50">
            <p>${formatTemp(item.main.temp)}</p>
            <p class="desc">${item.weather[0].description}</p>
        `;
        hourlyContainer.appendChild(card);
    });

    // Update Daily Forecast (Every 8th item -> 24 hours)
    dailyContainer.innerHTML = '';
    for (let i = 7; i < currentForecastData.list.length; i += 8) {
        const item = currentForecastData.list[i];
        const card = document.createElement('div');
        card.className = 'dayF';
        card.innerHTML = `
            <p class="date">${formatDate(item.dt, timezone)}</p>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="icon" width="50">
            <p>${formatTemp(item.main.temp_max)} / ${formatTemp(item.main.temp_min)}</p>
            <p class="desc">${item.weather[0].description}</p>
        `;
        dailyContainer.appendChild(card);
    }
}

function formatTemp(kelvin) {
    if (currentUnit === 'C') {
        return `${Math.round(kelvin - 273.15)}°C`;
    } else {
        return `${Math.round((kelvin - 273.15) * 9/5 + 32)}°F`;
    }
}

function formatTime(timestamp, timezoneOffset) {
    // timestamp is in seconds, timezoneOffset is in seconds
    const date = new Date((timestamp + timezoneOffset) * 1000);
    // Adjust for UTC since we added the offset manually
    // Actually, a better way is to use Intl.DateTimeFormat with timeZone option if we had the IANA zone name.
    // Since we only have offset, we can construct a UTC date that represents the local time.
    const utcDate = new Date(date.toUTCString().slice(0, -4)); 
    return utcDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function formatDate(timestamp, timezoneOffset) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    const utcDate = new Date(date.toUTCString().slice(0, -4));
    return utcDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function updateBackground(weatherMain) {
    document.body.className = ''; // Reset
    const condition = weatherMain.toLowerCase();
    if (condition.includes('clear')) document.body.classList.add('clear');
    else if (condition.includes('cloud')) document.body.classList.add('clouds');
    else if (condition.includes('rain') || condition.includes('drizzle')) document.body.classList.add('rain');
    else if (condition.includes('snow')) document.body.classList.add('snow');
    else if (condition.includes('thunder')) document.body.classList.add('thunderstorm');
    else document.body.classList.add('clouds'); // Default
}

function toggleUnit() {
    currentUnit = currentUnit === 'C' ? 'F' : 'C';
    unitToggleEl.innerText = currentUnit === 'C' ? '°C / °F' : '°F / °C';
    updateUI();
}

function showLoading(show) {
    if (show) loadingEl.classList.remove('hidden');
    else loadingEl.classList.add('hidden');
}

function showError(msg) {
    errorEl.innerText = msg;
    errorEl.classList.remove('hidden');
    setTimeout(() => {
        errorEl.classList.add('hidden');
    }, 3000);
}

function hideError() {
    errorEl.classList.add('hidden');
}
