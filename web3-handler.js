let provider, signer, contract, usdtContract;

// --- CONFIGURATION ---
const CONTRACT_ADDRESS = "0x5e5349C0212196B96e7Df8dca42D861ffA7f78A0"; 
const USDT_ADDRESS = "0x3b66b1e08f55af26c8ea14a73da64b6bc8d799de"; // BEP20 USDT
const CHAIN_ID = 97; // BSC Mainnet

// --- RANK CONFIG (Same as you provided) ---
const RANK_DETAILS = [
    { name: "NONE", roi: "0%", targetTeam: 0, targetVolume: 0 },
    { name: "V1", roi: "1.00%", targetTeam: 50, targetVolume: 2.83 },
    { name: "V2", roi: "2.00%", targetTeam: 100, targetVolume: 5.66 },
    { name: "V3", roi: "3.00%", targetTeam: 200, targetVolume: 11.33 },
    { name: "V4", roi: "4.00%", targetTeam: 400, targetVolume: 16.99 },
    { name: "V5", roi: "6.00%", targetTeam: 800, targetVolume: 28.32 },
    { name: "V6", roi: "8.00%", targetTeam: 1500, targetVolume: 56.64 },
    { name: "V7", roi: "10.00%", targetTeam: 2500, targetVolume: 113.29 }
];

// --- ABI (Updated for New Contract) ---
const CONTRACT_ABI = [
    "function invest(string username, string sponsorUsername, uint256 amount) external",
    "function withdrawWorking() external",
    "function withdrawMaturity(uint256 _idx) external",
    "function transferFund(string _toUsername, uint256 _amount) external",
    "function getUserDashboard(address _user) view returns (tuple(uint256 totalLevelIncome, uint256 totalLevelROIIncome, uint256 totalDirectActive, uint256 totalDirectInactive, uint256 totalTeamActive, uint256 totalTeamInactive, uint256 totalIncome, uint256 totalROIIncome, uint256 totalWithdrawal, uint256 availableBalance))",
    "function users(address) view returns (string username, address sponsor, uint256 directCount, uint256 workingBalance, uint256 totalWithdrawn, uint256 statLevelIncome, uint256 statLevelROIIncome)",
    "function getLevelTeamDetails(address _account, uint256 _level) view returns (tuple(address userAddress, string username, uint256 package, uint256 joinTime)[])",
    "function getTransactionHistory(address _user) view returns (tuple(uint8 tType, uint256 amount, uint256 timestamp, string remarks)[])"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];

// --- INITIALIZATION ---
async function init() {
    checkReferralURL();
    if (window.ethereum) {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            const accounts = await provider.listAccounts();
            signer = provider.getSigner();
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);

            if (accounts.length > 0 && localStorage.getItem('manualLogout') !== 'true') {
                setupApp(accounts[0]);
            }
        } catch (error) { console.error("Init Error", error); }
    }
}

// --- REFERRAL AUTO-FILL ---
function checkReferralURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const refName = urlParams.get('ref');
    const refField = document.getElementById('reg-referrer');
    if (refName && refField) {
        refField.value = refName.trim();
    }
}

// --- CORE FUNCTIONS (Updated for USDT & New Contract) ---

window.handleDeposit = async function() {
    const amountInput = document.getElementById('deposit-amount');
    const userField = document.getElementById('reg-username');
    const refField = document.getElementById('reg-referrer');
    const depositBtn = document.getElementById('deposit-btn');

    if (!amountInput.value || amountInput.value < 10) return alert("Min investment 10 USDT");
    
    const amountInWei = ethers.utils.parseUnits(amountInput.value.toString(), 18);
    const username = userField ? userField.value.trim() : "";
    const sponsor = refField ? refField.value.trim() : "Admin";

    try {
        depositBtn.disabled = true;
        depositBtn.innerText = "APPROVING USDT...";

        const allowance = await usdtContract.allowance(await signer.getAddress(), CONTRACT_ADDRESS);
        if (allowance.lt(amountInWei)) {
            const aprTx = await usdtContract.approve(CONTRACT_ADDRESS, ethers.constants.MaxUint256);
            await aprTx.wait();
        }

        depositBtn.innerText = "INVESTING...";
        const tx = await contract.invest(username, sponsor, amountInWei);
        await tx.wait();
        location.reload();
    } catch (err) {
        alert("Error: " + (err.reason || err.message));
        depositBtn.innerText = "DEPOSIT NOW";
        depositBtn.disabled = false;
    }
}

window.handleClaim = async function() {
    try {
        const tx = await contract.withdrawWorking();
        await tx.wait();
        location.reload();
    } catch (err) { alert("Withdraw failed: " + (err.reason || err.message)); }
}

// Fixed Maturity Withdrawal (Principal)
window.handleCapitalWithdraw = async function(index = 0) {
    if(!confirm("Withdraw Principal at Maturity?")) return;
    try {
        const tx = await contract.withdrawMaturity(index);
        await tx.wait();
        location.reload();
    } catch (err) { alert("Not reached maturity or already withdrawn."); }
}

// --- DATA SYNC (Dashboard & Leadership) ---

async function fetchAllData(address) {
    try {
        const [userData, dash] = await Promise.all([
            contract.users(address),
            contract.getUserDashboard(address)
        ]);

        // Basic Stats
        updateText('total-deposit-display', format(dash.totalROIIncome)); // Est. Total ROI
        updateText('active-deposit', format(dash.totalROIIncome));
        updateText('total-earned', format(dash.totalIncome));
        updateText('total-withdrawn', format(dash.totalWithdrawal));
        
        // Balance
        const balance = format(dash.availableBalance);
        updateText('withdrawable-display', balance);
        updateText('withdrawable-balance-main', balance);
        updateText('ref-balance-display', format(dash.totalLevelIncome));

        // Team Stats
        updateText('direct-count', dash.totalDirectActive.toString());
        updateText('team-count', dash.totalTeamActive.toString());
        updateText('level-earnings', format(dash.totalLevelIncome));

        // Referral URL
        const refUrl = `${window.location.origin}/register.php?ref=${userData.username}`;
        if(document.getElementById('refURL')) document.getElementById('refURL').value = refUrl;

    } catch (err) { console.error("Fetch Error:", err); }
}

// --- TEAM TABLE LOGIC ---
window.loadLevelData = async function(level) {
    const tableBody = document.getElementById('team-table-body');
    if(!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="5" class="p-10 text-center text-yellow-500 italic">Scanning...</td></tr>`;
    
    try {
        const address = await signer.getAddress();
        const members = await contract.getLevelTeamDetails(address, level);

        if (members.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="p-10 text-center text-gray-500">No users found</td></tr>`;
            return;
        }
        
        tableBody.innerHTML = members.map(m => `
            <tr class="border-b border-white/5">
                <td class="p-4">${m.username}</td>
                <td class="p-4 text-xs font-mono">${m.userAddress.substring(0,10)}...</td>
                <td class="p-4">${format(m.package)} USDT</td>
                <td class="p-4">${new Date(m.joinTime * 1000).toLocaleDateString()}</td>
                <td class="p-4 ${m.package > 0 ? 'text-green-500' : 'text-red-500'} font-bold">
                    ${m.package > 0 ? 'ACTIVE' : 'INACTIVE'}
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

// --- TIMER & REDIRECTION ---
function start8HourCountdown() {
    const timerElement = document.getElementById('next-timer');
    if (!timerElement) return;
    setInterval(() => {
        const now = new Date();
        const nextTarget = Math.ceil(now.getTime() / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000); // 24h sync
        const diff = nextTarget - now.getTime();
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        timerElement.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

async function setupApp(address) {
    const user = await contract.users(address);
    const path = window.location.pathname;

    if (user.username === "" && !path.includes('register.html')) {
        window.location.href = "register.html";
    } else {
        fetchAllData(address);
        start8HourCountdown();
        updateNavbar(address);
        if (path.includes('history.html')) fetchHistory(address);
    }
}

// --- UTILS ---
const format = (val) => {
    if (!val) return "0.00";
    return parseFloat(ethers.utils.formatUnits(val, 18)).toFixed(2);
};

const updateText = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };

function updateNavbar(addr) {
    const btn = document.getElementById('connect-btn');
    if(btn) btn.innerText = addr.substring(0,6) + "..." + addr.substring(38);
}


window.addEventListener('load', init);
