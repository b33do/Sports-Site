// --- DOM ELEMENTS ---
const dataContainer = document.getElementById('data-container');
const btnSoccer = document.getElementById('btn-soccer');
const btnF1 = document.getElementById('btn-f1');
const soccerControls = document.getElementById('soccer-controls');
const f1Controls = document.getElementById('f1-controls');
const leagueSelect = document.getElementById('league-select');
const f1YearContainer = document.getElementById('f1-year-container');
const f1YearSelect = document.getElementById('f1-year-select');
const soccerViewControls = document.getElementById('soccer-view-controls');

// --- APP STATE ---
let currentF1View = 'results';
let currentSoccerView = 'standings';

// --- HELPER FUNCTIONS ---
const showLoading = () => {
    dataContainer.innerHTML = '<p>Loading...</p>';
};

const handleError = (error) => {
    console.error('Error:', error);
    dataContainer.innerHTML = '<p style="color: red;">Could not fetch data. The season may not have finished or the API is temporarily unavailable.</p>';
};

// --- SOCCER FUNCTIONS ---
const fetchSoccerData = () => {
    const leagueId = leagueSelect.value;
    if (currentSoccerView === 'standings') {
        fetchLeagueTable(leagueId);
    } else {
        fetchLeagueFixtures(leagueId);
    }
};

const fetchLeagueTable = async (leagueId) => {
    showLoading();
    // FIX #1: Added the current season to the API call to get the full table.
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11 (Jan-Dec)
    const currentSeason = currentMonth >= 7 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
    
    const url = `https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=${leagueId}&s=${currentSeason}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.table) {
            generateSoccerTable(data.table);
        } else {
            dataContainer.innerHTML = '<p>Table data not available for this season.</p>';
        }
    } catch (error) {
        handleError(error);
    }
};

const fetchLeagueFixtures = async (leagueId) => {
    showLoading();
    const url = `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${leagueId}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.events) {
            generateFixturesDisplay(data.events);
        } else {
            dataContainer.innerHTML = '<p>No upcoming fixtures found for this league.</p>';
        }
    } catch (error) {
        handleError(error);
    }
};

const generateSoccerTable = (tableData) => {
    let html = `<table><thead><tr><th>Pos</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead><tbody>`;
    tableData.forEach(team => {
        // FIX #2: Removed the "/preview" suffix from the image URL to load logos correctly.
        html += `<tr><td>${team.intRank}</td><td class="team-name"><img src="${team.strTeamBadge}" alt="${team.strTeam} badge" class="team-badge" onerror="this.onerror=null;this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZGh0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMjJzOC00IDgtMTBWNUw1IDEybDcgMTB6Ij48L3BhdGg+PHBhdGggZD0iTTUgMUwxMiA1djE3TC0xIDEyeiI+PC9wYXRoPjwvc3ZnPg==';">${team.strTeam}</td><td>${team.intPlayed}</td><td>${team.intWin}</td><td>${team.intDraw}</td><td>${team.intLoss}</td><td><strong>${team.intPoints}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    dataContainer.innerHTML = html;
};

const generateFixturesDisplay = (fixturesData) => {
    let html = '<h2>Upcoming Fixtures</h2><div class="fixture-list">';
    fixturesData.forEach(fixture => {
        const date = new Date(fixture.dateEvent);
        const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
        html += `
            <div class="fixture-item">
                <div class="fixture-teams">${fixture.strHomeTeam} vs ${fixture.strAwayTeam}</div>
                <div class="fixture-details">
                    <div>${formattedDate}</div>
                    <div>${fixture.strTimeLocal ? fixture.strTimeLocal.substring(0, 5) : 'TBC'}</div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    dataContainer.innerHTML = html;
};

// --- FORMULA 1 FUNCTIONS ---
const fetchF1Data = async (dataType, year) => {
    showLoading();
    let url = '';
    switch (dataType) {
        case 'results':
            url = `https://api.jolpi.ca/ergast/f1/current/last/results.json`;
            break;
        case 'drivers':
            url = `https://api.jolpi.ca/ergast/f1/${year}/driverstandings.json`;
            break;
        case 'constructors':
            url = `https://api.jolpi.ca/ergast/f1/${year}/constructorstandings.json`;
            break;
    }
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (dataType !== 'results' && year === new Date().getFullYear()) {
                fetchF1Data(dataType, year - 1);
                return;
            }
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (parseInt(data.MRData.total) === 0) {
            dataContainer.innerHTML = `<p>No data available for this query.</p>`;
            return;
        }
        switch (dataType) {
            case 'results':
                generateRaceResultsTable(data);
                break;
            case 'drivers':
                generateDriverStandingsTable(data);
                break;
            case 'constructors':
                generateConstructorStandingsTable(data);
                break;
        }
    } catch (error) {
        handleError(error);
    }
};

const generateRaceResultsTable = (data) => {
    const raceData = data.MRData.RaceTable.Races[0];
    let html = `<h2>Results: ${raceData.raceName} (${raceData.season})</h2><table><thead><tr><th>Pos</th><th>Driver</th><th>Constructor</th><th>Time</th><th>Status</th></tr></thead><tbody>`;
    raceData.Results.forEach(driver => {
        html += `<tr><td>${driver.position}</td><td>${driver.Driver.givenName} ${driver.Driver.familyName}</td><td>${driver.Constructor.name}</td><td>${driver.Time?.time || 'N/A'}</td><td>${driver.status}</td></tr>`;
    });
    html += `</tbody></table>`;
    dataContainer.innerHTML = html;
};

const generateDriverStandingsTable = (data) => {
    const standingsData = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
    let html = `<h2>Driver Standings (${data.MRData.StandingsTable.season})</h2><table><thead><tr><th>Pos</th><th>Driver</th><th>Constructor</th><th>Pts</th></tr></thead><tbody>`;
    standingsData.forEach(driver => {
        html += `<tr><td>${driver.position}</td><td>${driver.Driver.givenName} ${driver.Driver.familyName}</td><td>${driver.Constructors[0].name}</td><td><strong>${driver.points}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    dataContainer.innerHTML = html;
};

const generateConstructorStandingsTable = (data) => {
    const standingsData = data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;
    let html = `<h2>Constructor Standings (${data.MRData.StandingsTable.season})</h2><table><thead><tr><th>Pos</th><th>Team</th><th>Pts</th></tr></thead><tbody>`;
    standingsData.forEach(team => {
        html += `<tr><td>${team.position}</td><td>${team.Constructor.name}</td><td><strong>${team.points}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    dataContainer.innerHTML = html;
};

const populateYearSelect = () => {
    const currentYear = new Date().getFullYear();
    f1YearSelect.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        f1YearSelect.appendChild(option);
    }
};

// --- EVENT LISTENERS ---
btnSoccer.addEventListener('click', () => {
    soccerControls.classList.remove('hidden');
    f1Controls.classList.add('hidden');
    btnSoccer.classList.add('active');
    btnF1.classList.remove('active');
    fetchSoccerData();
});

btnF1.addEventListener('click', () => {
    f1Controls.classList.remove('hidden');
    soccerControls.classList.add('hidden');
    btnF1.classList.add('active');
    btnSoccer.classList.remove('active');
    f1YearContainer.classList.add('hidden');
    currentF1View = 'results';
    fetchF1Data('results');
});

leagueSelect.addEventListener('change', fetchSoccerData);

soccerViewControls.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    if (e.target.classList.contains('active')) return;

    soccerViewControls.querySelector('.active').classList.remove('active');
    e.target.classList.add('active');
    
    currentSoccerView = e.target.dataset.view;
    fetchSoccerData();
});

f1Controls.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    
    const dataType = e.target.dataset.type;
    currentF1View = dataType;
    if (dataType === 'results') {
        f1YearContainer.classList.add('hidden');
        fetchF1Data('results');
    } else {
        f1YearContainer.classList.remove('hidden');
        fetchF1Data(dataType, f1YearSelect.value);
    }
});

f1YearSelect.addEventListener('change', () => {
    fetchF1Data(currentF1View, f1YearSelect.value);
});

// --- INITIALIZATION ---
function init() {
    populateYearSelect();
    fetchLeagueTable(leagueSelect.value);
}

init();

