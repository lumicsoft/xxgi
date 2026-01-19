let provider, signer, contract, usdtContract;

// --- CONFIGURATION ---
const CONTRACT_ADDRESS = "0x5e5349C0212196B96e7Df8dca42D861ffA7f78A0"; 
const USDT_ADDRESS = "0x3b66b1e08f55af26c8ea14a73da64b6bc8d799de"; // BEP20 USDT
const CHAIN_ID = 97; // BSC Testnet (Aapne 97 likha hai, jo Testnet hai)

// --- RANK CONFIG FOR LEADERSHIP ---
const RANK_DETAILS = [
    { name: "NONE", roi: "0%", targetTeam: 0, targetVolume: 0 },
    { name: "V1", roi: "1.00%", targetTeam: 50, targetVolume: 2.83 },
    { name: "V2", roi: "2.00%", targetTeam: 100, targetVolume:  5.66 },
    { name: "V3", roi: "3.00%", targetTeam: 200, targetVolume: 11.33 },
    { name: "V4", roi: "4.00%", targetTeam: 400, targetVolume: 16.99 },
    { name: "V5", roi: "6.00%", targetTeam: 800, targetVolume: 28.32 },
    { name: "V6", roi: "8.00%", targetTeam: 1500, targetVolume: 56.64  },
    { name: "V7", roi: "10.00%", targetTeam: 2500, targetVolume: 113.29  }
];

// --- ABI ---
const CONTRACT_ABI = [
    "function register(string _username, string _sponsorUsername) external",
    "function invest(uint256 _amount) external",
    "function withdrawWorking() external",
    "function withdrawMaturity(uint256 _idx) external",
    "function transferFund(string _toUsername, uint256 _amount) external",
    "function getLiveStat(address _user) view returns (uint256 totalAvailable, uint256 pendingMyROI)",
    "function getUserDashboard(address _user) view returns (tuple(uint256 totalLevelIncome, uint256 totalLevelROIIncome, uint256 totalDirectActive, uint256 totalDirectInactive, uint256 totalTeamActive, uint256 totalTeamInactive, uint256 totalIncome, uint256 totalROIIncome, uint256 totalWithdrawal, uint256 availableBalance, uint256 livePendingROI))",
    "function users(address) view returns (string username, address sponsor, uint256 directCount, uint256 workingBalance, uint256 totalWithdrawn, uint256 statLevelIncome, uint256 statLevelROIIncome, uint256 rank)",
    "function getLevelTeamDetails(address _account, uint256 _level) view returns (address[] wallets, string[] names, uint256[] joinDates, uint256[] activeDeps, uint256[] teamTotalDeps)",
    "function getTransactionHistory(address _user) view returns (tuple(uint8 tType, uint256 amount, uint256 timestamp, string remarks)[])"
];
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];

const calculateGlobalROI = (amount) => {
    const amt = parseFloat(amount);
    if (amt >= 5.665) return 6.00;
    if (amt >= 2.832) return 5.75;
    if (amt >= 1.133) return 5.50;
    if (amt >= 0.566) return 5.25;
    return 5.00;
};

// --- 1. AUTO-FILL LOGIC ---
function checkReferralURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const refName = urlParams.get('ref'); 
    const refField = document.getElementById('reg-referrer');

    if (refName && refField) {
        refField.value = refName.trim();
        console.log("Referral auto-filled from URL:", refName);
    }
}

// --- INITIALIZATION ---
async function init() {
    checkReferralURL();
    if (window.ethereum) {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            const accounts = await provider.listAccounts();
            signer = provider.getSigner();
            
            // Initialize Contracts Globally
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer); 

            if (accounts.length > 0) {
                if (localStorage.getItem('manualLogout') !== 'true') {
                    await setupApp(accounts[0]);
                } else {
                    updateNavbar(accounts[0]);
                }
            }
        } catch (error) { console.error("Init Error", error); }
    } else { alert("Please install MetaMask!"); }
}

// --- CORE LOGIC ---
window.handleInvest = async function() {
    const amountInput = document.getElementById('deposit-amount');
    const depositBtn = document.getElementById('deposit-btn');
    if (!amountInput || !amountInput.value || amountInput.value < 10) return alert("Min 10 USDT required!");
    
    const amountInWei = ethers.utils.parseUnits(amountInput.value.toString(), 18);
    
    try {
        depositBtn.disabled = true;
        depositBtn.innerText = "APPROVING...";
        const userAddr = await signer.getAddress();
        const allowance = await usdtContract.allowance(userAddr, CONTRACT_ADDRESS);
        
        if (allowance.lt(amountInWei)) {
            const appTx = await usdtContract.approve(CONTRACT_ADDRESS, ethers.constants.MaxUint256);
            await appTx.wait();
        }

        depositBtn.innerText = "INVESTING...";
        const tx = await contract.invest(amountInWei);
        await tx.wait();
        location.reload(); 
    } catch (err) {
        alert("Error: " + (err.reason || err.message));
        depositBtn.innerText = "INVEST NOW";
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

window.claimNetworkReward = async function(amountInWei) {
    try {
        const tx = await contract.claimNetworkReward(amountInWei);
        await tx.wait();
        location.reload();
    } catch (err) { alert("Network claim failed: " + (err.reason || err.message)); }
}

window.handleLogin = async function() {
    try {
        if (!window.ethereum) return alert("Please install MetaMask!");
        
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length === 0) return;
        
        const userAddress = accounts[0]; 
        
        signer = provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        localStorage.removeItem('manualLogout');
        
        const userData = await contract.users(userAddress);

        if (userData.username !== "") {
            if(typeof showLogoutIcon === "function") showLogoutIcon(userAddress);
            window.location.href = "index1.php";
        } else {
            alert("This wallet is not registered!");
            window.location.href = "register.php";
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert("Login failed! Make sure you are on BSC network.");
    }
}

window.handleRegister = async function() {
    const userField = document.getElementById('reg-username');
    const refField = document.getElementById('reg-referrer');
    if (!userField || !refField) return;
    try {
       const tx = await contract.register(userField.value.trim(), refField.value.trim());
        await tx.wait();
        localStorage.removeItem('manualLogout'); 
        window.location.href = "index1.php";
    } catch (err) { alert("Error: " + (err.reason || err.message)); }
}

window.handleLogout = function() {
    if (confirm("Do you want to disconnect?")) {
        localStorage.setItem('manualLogout', 'true');
        signer = null;
        contract = null;
        const connectBtn = document.getElementById('connect-btn');
        const logoutBtn = document.getElementById('logout-icon-btn');
        if (connectBtn) connectBtn.innerText = "Connect Wallet";
        if (logoutBtn) logoutBtn.style.display = 'none';
        window.location.href = "index.php";
    }
}

function showLogoutIcon(address) {
    const btn = document.getElementById('connect-btn');
    const logout = document.getElementById('logout-icon-btn');
    if (btn) btn.innerText = address.substring(0, 6) + "..." + address.substring(38);
    if (logout) {
        logout.style.display = 'flex'; 
    }
}

async function setupApp(address) {
    const { chainId } = await provider.getNetwork();
    if (chainId !== CHAIN_ID) { alert("Please switch to BSC Network!"); return; }
    
    const userData = await contract.users(address);
    const path = window.location.pathname;

    if (userData.username === "") {
        if (!path.includes('register.php') && !path.includes('login.php')) {
            window.location.href = "register.php"; 
            return; 
        }
    } else {
        if (path.includes('register.php') || path.includes('login.php') || path.endsWith('/') || path.endsWith('index.php')) {
            window.location.href = "index1.php";
            return;
        }
    }

    updateNavbar(address);
    showLogoutIcon(address); 

    if (path.includes('index1.php')) {
        fetchAllData(address);
        start8HourCountdown(); 
    }

    if (path.includes('leadership.php')) {
        fetchLeadershipData(address);
    }
    
    if (path.includes('history.php')) {
        window.showHistory('deposit');
    }
}

window.showHistory = async function(type) {
    const container = document.getElementById('history-container');
    if(!container) return;
    
    container.innerHTML = `<div class="p-10 text-center text-yellow-500 italic">Blockchain Syncing...</div>`;
    
    const logs = await window.fetchBlockchainHistory(type);
    
    if (logs.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-gray-500">No transactions found.</div>`;
        return;
    }

    container.innerHTML = logs.map(item => `
        <div class="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex justify-between items-center">
            <div>
                <h4 class="font-bold ${item.color}">${item.type}</h4>
                <p class="text-xs text-gray-400">${item.date} | ${item.time}</p>
                ${item.extra ? `<p class="text-[10px] text-yellow-500 mt-1">${item.extra}</p>` : ''}
            </div>
            <div class="text-right">
                <span class="text-lg font-black text-white">${item.amount}</span>
                <p class="text-[10px] text-gray-500 italic uppercase">Completed</p>
            </div>
        </div>
    `).join('');
}

window.fetchBlockchainHistory = async function(type) {
    try {
        const address = await signer.getAddress();
        const logs = await contract.getTransactionHistory(address);
        
        return logs.map(item => {
            const dt = new Date(item.timestamp.toNumber() * 1000);
            return {
                type: ["DEPOSIT", "WITHDRAWAL", "TRANSFER", "INCOME"][item.tType] || "UNKNOWN",
                amount: format(item.amount),
                date: dt.toLocaleDateString(),
                time: dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                extra: item.remarks,
                color: item.tType === 1 ? 'text-red-400' : 'text-cyan-400',
                ts: item.timestamp.toNumber()
            };
        }).reverse();
    } catch (e) { return []; }
}

async function fetchLeadershipData(address) {
    try {
        const [d, u] = await Promise.all([
            contract.getUserDashboard(address),
            contract.users(address)
        ]);

        const rIdx = u.rank ? u.rank.toNumber() : 0; 

        updateText('rank-display', RANK_DETAILS[rIdx]?.name || "NONE");
        updateText('team-active-deposit', format(d.totalTeamActive));
        updateText('total-rank-earned', format(d.totalLevelROIIncome));
        
        await loadLeadershipDownlines(address, rIdx);
        
    } catch (err) { console.error("Leadership Error:", err); }
}

async function loadLeadershipDownlines(address, myRankIdx) {
    const tableBody = document.getElementById('direct-downline-body');
    if(!tableBody) return;

    try {
        const res = await contract.getLevelTeamDetails(address, 1);
        const wallets = res.wallets || [];
        const names = res.names || [];
        const activeDeps = res.activeDeps || [];
        const teamTotalDeps = res.teamTotalDeps || [];

        if (wallets.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-gray-500 italic">No direct members found</td></tr>`;
            return;
        }

        let html = '';
        const myROIValue = parseFloat(RANK_DETAILS[myRankIdx].roi.replace('%', ''));

        for(let i=0; i < wallets.length; i++) {
            const uA = wallets[i];
            if (!uA || uA === ethers.constants.AddressZero) continue;

            const dUser = await contract.users(uA);
            const mRankIdx = dUser.rank ? dUser.rank.toNumber() : 0;
            const mROIValue = parseFloat(RANK_DETAILS[mRankIdx].roi.replace('%', ''));
            const diff = Math.max(myROIValue - mROIValue, 0).toFixed(2);

            html += `
            <tr class="border-b border-white/5 hover:bg-white/10 transition-all">
                <td class="p-4 flex flex-col">
                    <span class="text-white font-bold">${names[i] || 'User'}</span>
                    <span class="text-[9px] text-gray-400">${uA.substring(0,8)}...</span>
                </td>
                <td class="p-4 text-yellow-500 font-bold">${RANK_DETAILS[mRankIdx].name}</td>
                <td class="p-4">${format(dUser.workingBalance)}</td> 
                <td class="p-4 text-green-400">${format(activeDeps[i])}</td>
                <td class="p-4 text-center">${dUser.directCount || 0}</td>
                <td class="p-4 text-blue-400 font-bold">${diff}%</td>
                <td class="p-4 font-mono text-sm">${format(teamTotalDeps[i] || 0)}</td>
            </tr>`;
        }
        tableBody.innerHTML = html;

    } catch (e) { 
        console.error("Downline Table Error:", e);
        tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500">Error loading team data</td></tr>`;
    }
}

async function fetchAllData(address) {
    try {
        const [user, dashboard] = await Promise.all([
            contract.users(address),
            contract.getUserDashboard(address)
        ]);

        if (user.username === "") return;

        updateText('total-deposit-display', format(user.workingBalance));
        updateText('active-deposit', format(user.workingBalance)); 
        updateText('total-earned', format(dashboard.totalIncome));
        updateText('total-withdrawn', format(dashboard.totalWithdrawal));
        updateText('team-count', dashboard.totalTeamActive.toString());
        updateText('direct-count', dashboard.totalDirectActive.toString());
        updateText('level-earnings', format(dashboard.totalLevelIncome));
        updateText('direct-earnings', format(dashboard.totalLevelROIIncome)); 
        updateText('ref-balance-display', format(dashboard.totalLevelIncome));
        updateText('compounding-balance', format(dashboard.livePendingROI));
        updateText('withdrawable-display', format(dashboard.availableBalance));

        const activeAmt = parseFloat(format(user.workingBalance));
        updateText('cp-display', activeAmt.toFixed(4));

        const statusBadge = document.getElementById('status-badge');
        if(statusBadge) {
            if(activeAmt > 0) {
                statusBadge.innerText = "● Active Status";
                statusBadge.className = "px-4 py-1 rounded-full bg-green-500/20 text-green-500 text-[10px] font-black border border-green-500/30 uppercase";
            } else {
                statusBadge.innerText = "● Inactive Status";
                statusBadge.className = "px-4 py-1 rounded-full bg-red-500/20 text-red-500 text-[10px] font-black border border-red-500/30 uppercase animate-pulse";
            }
        }

        const currentUrl = window.location.href.split('?')[0];
        const pageName = currentUrl.substring(currentUrl.lastIndexOf('/') + 1);
        const baseUrl = currentUrl.replace(pageName, 'register.php');
        const refUrl = `${baseUrl}?ref=${user.username}`;
        if(document.getElementById('refURL')) document.getElementById('refURL').value = refUrl;

    } catch (err) { console.error("Dashboard Fetch Error:", err); }
}

window.loadLevelData = async function(level) {
    const tableBody = document.getElementById('team-table-body');
    if(!tableBody) return;
    try {
        const address = await signer.getAddress();
        const res = await contract.getLevelTeamDetails(address, level);
        
        let html = '';
        for(let i=0; i < res.wallets.length; i++) {
            const activeD = parseFloat(format(res.activeDeps[i]));
            html += `<tr class="border-b border-white/5">
                <td class="p-4 text-white">${res.names[i]} <br><small>${res.wallets[i].substring(0,6)}...</small></td>
                <td class="p-4 text-yellow-500">${format(res.activeDeps[i])}</td>
                <td class="p-4 text-gray-400">${activeD > 0 ? 'ACTIVE' : 'INACTIVE'}</td>
            </tr>`;
        }
        tableBody.innerHTML = html || '<tr><td colspan="3" class="p-4 text-center">No Downline</td></tr>';
    } catch (e) { console.error(e); }
}

function start8HourCountdown() {
    const timerElement = document.getElementById('next-timer');
    if (!timerElement) return;

    setInterval(() => {
        const now = new Date();
        const nowUTC = now.getTime();
        const eightHoursInMs = 8 * 60 * 60 * 1000;
        const nextTargetUTC = Math.ceil(nowUTC / eightHoursInMs) * eightHoursInMs;
        const diff = nextTargetUTC - nowUTC;

        if (diff <= 0) {
            location.reload();
            return;
        }

        const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
        timerElement.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

const format = (val) => {
    try { 
        if (!val) return "0.0000"; 
        let f = ethers.utils.formatUnits(val.toString(), 18);
        return parseFloat(f).toFixed(4);
    } catch (e) { return "0.0000"; }
};

const updateText = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };

function updateNavbar(addr) {
    const btn = document.getElementById('connect-btn');
    if(btn) btn.innerText = addr.substring(0,6) + "..." + addr.substring(38);
}

if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => {
        localStorage.removeItem('manualLogout');
        location.reload();
    });
    window.ethereum.on('chainChanged', () => location.reload());
}

window.addEventListener('load', init);
