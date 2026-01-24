let provider, signer, contract, usdtContract;

// --- CONFIGURATION ---
const CONTRACT_ADDRESS = "0x1E526fb7ae52b451e4e86e376B4531Cae9b192D6"; 
const USDT_ADDRESS = "0x3b66b1e08f55af26c8ea14a73da64b6bc8d799de"; // BEP20 USDT
const CHAIN_ID = 97; // BSC Testnet

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
   "function getLevelTeamDetails(address _account, uint256 _level) view returns (tuple(address userAddress, string username, uint256 package, uint256 joinTime)[])",
    "function fetchAllUserData(address _user) view returns (tuple(string username, address userAddress, string sponsorName, address sponsorAddress, uint256 firstInvestAmount, uint256 firstInvestTime, uint256 totalSelfInvestment, uint256 totalTeamVolume, uint256 directCount, uint256 directActive, uint256 totalTeam, uint256 teamActive, uint256 teamInactive, uint256 workingBalance, uint256 pendingMaturity, uint256 totalWithdrawn, uint256 availableWithdrawable, uint256 totalLevelIncome, uint256 totalLevelROIIncome))",
    "function getTransactionHistory(address _user) view returns (tuple(uint8 tType, uint256 amount, uint256 timestamp, string remarks)[])"
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];

// --- HELPER TO ENSURE INITIALIZATION (Using logic from both codes) ---
async function ensureConnection() {
    if (!window.ethereum) {
        alert("Please install MetaMask!");
        return false;
    }
    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);

        // --- YEH DO LINES ZAROORI HAIN ---
        window.signer = signer;
        window.contract = contract;
        window.provider = provider;

        return true;
    } catch (e) {
        console.error("Connection failed", e);
        return false;
    }
}
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
    if (typeof checkReferralURL === "function") checkReferralURL();
    
    if (window.ethereum) {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            const accounts = await provider.listAccounts();
            
            // Re-sync Global Variables - Humne window. lagaya hai taaki referral page ise dekh sake
            window.signer = provider.getSigner(); 
            window.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, window.signer);
            window.usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, window.signer);

            if (accounts.length > 0) {
                if (localStorage.getItem('manualLogout') !== 'true') {
                    await setupApp(accounts[0]);
                }
            }
        } catch (error) { console.warn("Initialization silent: Wallet not yet connected."); }
    } else {
        console.log("MetaMask not detected on page load.");
        // alert("Please install MetaMask!"); // Optional: Can be enabled if needed
    }
}

// --- CORE LOGIC ---
window.handleInvest = async function() {
    if (!(await ensureConnection())) return;

    const amountInput = document.getElementById('deposit-amount');
    const depositBtn = document.getElementById('deposit-btn');
    
    if (!amountInput || !amountInput.value || parseFloat(amountInput.value) < 10) {
        return alert("Minimum 10 USDT required!");
    }
    
    // USDT has 18 decimals usually, but check your token
    const amountInWei = ethers.utils.parseUnits(amountInput.value.toString(), 18);
    
    try {
        depositBtn.disabled = true;
        const userAddr = await signer.getAddress();

        // --- STEP 1: BALANCE CHECK ---
        depositBtn.innerText = "CHECKING BALANCE...";
        const balance = await usdtContract.balanceOf(userAddr);
        if (balance.lt(amountInWei)) {
            depositBtn.disabled = false;
            depositBtn.innerText = "INVEST NOW";
            return alert("Aapke wallet mein paryapt USDT nahi hai!");
        }

        // --- STEP 2: APPROVAL ---
        depositBtn.innerText = "CHECKING ALLOWANCE...";
        const allowance = await usdtContract.allowance(userAddr, CONTRACT_ADDRESS);
        
        if (allowance.lt(amountInWei)) {
            depositBtn.innerText = "APPROVING USDT...";
            console.log("Approving USDT for Contract...");
            const appTx = await usdtContract.approve(CONTRACT_ADDRESS, ethers.constants.MaxUint256);
            await appTx.wait();
            console.log("Approval Done!");
        }

        // --- STEP 3: INVESTMENT ---
        depositBtn.innerText = "WAITING FOR WALLET...";
        console.log("Sending Invest Transaction...");
        
        // Manual Gas Limit for safety
       const tx = await contract.invest(amountInWei);
        
        depositBtn.innerText = "PROCESSING...";
        await tx.wait();
        
        alert("Investment Successful!");
        location.reload(); 
        
    } catch (err) {
        console.error("Full Error Object:", err);
        
        // Error handling for user
        let errorMsg = err.reason || err.message;
        if (errorMsg.includes("user rejected")) {
            errorMsg = "Aapne transaction cancel kar di.";
        } else if (errorMsg.includes("INSUFFICIENT_FUNDS")) {
            errorMsg = "Fees ke liye BNB nahi hai!";
        }

        alert("Deposit Failed: " + errorMsg);
        depositBtn.innerText = "INVEST NOW";
        depositBtn.disabled = false;
    }
}
window.handleClaim = async function() {
    if (!(await ensureConnection())) return;
    try {
        const tx = await contract.withdrawWorking();
        await tx.wait();
        location.reload();
    } catch (err) { alert("Withdraw failed: " + (err.reason || err.message)); }
}

window.claimNetworkReward = async function(amountInWei) {
    if (!(await ensureConnection())) return;
    try {
        const tx = await contract.claimNetworkReward(amountInWei);
        await tx.wait();
        location.reload();
    } catch (err) { alert("Network claim failed: " + (err.reason || err.message)); }
}

window.handleLogin = async function() {
    try {
        if (!(await ensureConnection())) return;
        
        const userAddress = await signer.getAddress();
        localStorage.removeItem('manualLogout');
        
        const userData = await contract.users(userAddress);

        if (userData.username !== "") {
            if(typeof showLogoutIcon === "function") showLogoutIcon(userAddress);
            window.location.href = "index1.html";
        } else {
            alert("This wallet is not registered!");
            window.location.href = "register.html";
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert("Login failed! Make sure you are on BSC network.");
    }
}

window.handleRegister = async function() {
    if (!(await ensureConnection())) return;

    const userField = document.getElementById('reg-username');
    const refField = document.getElementById('reg-referrer');
    if (!userField || !refField || userField.value.trim() === "") return alert("Please enter username");
    
    try {
       const tx = await contract.register(userField.value.trim(), refField.value.trim());
        await tx.wait();
        localStorage.removeItem('manualLogout'); 
        window.location.href = "index1.html";
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
        window.location.href = "index.html";
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
    if (chainId !== CHAIN_ID) { alert("Please switch to BSC Testnet (Chain ID 97)!"); return; }
    
    const userData = await contract.users(address);
    const path = window.location.pathname;

    if (userData.username === "") {
        if (!path.includes('register.html') && !path.includes('login.html') && !path.endsWith('index.html') && !path.endsWith('/')) {
            window.location.href = "register.html"; 
            return; 
        }
    } else {
        if (path.includes('register.html') || path.includes('login.html') || path.endsWith('index.html') || path.endsWith('/')) {
            if (!path.includes('index1.html')) {
                window.location.href = "index1.html";
                return;
            }
        }
    }

    updateNavbar(address);
    showLogoutIcon(address); 

    if (path.includes('index1.html')) {
        fetchAllData(address);
        start8HourCountdown(); 
    }

    if (path.includes('leadership.html')) {
        fetchLeadershipData(address);
    }
    
    if (path.includes('history.html')) {
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
        const myRank = RANK_DETAILS[myRankIdx] || RANK_DETAILS[0];
        const myROIValue = parseFloat(myRank.roi.replace('%', ''));

        for(let i=0; i < wallets.length; i++) {
            const uA = wallets[i];
            if (!uA || uA === ethers.constants.AddressZero) continue;

            const dUser = await contract.users(uA);
            const mRankIdx = dUser.rank ? dUser.rank.toNumber() : 0;
            const mRank = RANK_DETAILS[mRankIdx] || RANK_DETAILS[0];
            const mROIValue = parseFloat(mRank.roi.replace('%', ''));
            const diff = Math.max(myROIValue - mROIValue, 0).toFixed(2);

            html += `
            <tr class="border-b border-white/5 hover:bg-white/10 transition-all">
                <td class="p-4 flex flex-col">
                    <span class="text-white font-bold">${names[i] || 'User'}</span>
                    <span class="text-[9px] text-gray-400">${uA.substring(0,8)}...</span>
                </td>
                <td class="p-4 text-yellow-500 font-bold">${mRank.name}</td>
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
        // Sirf ek hi call contract ko jayegi
        const data = await contract.fetchAllUserData(address);

        if (data.username === "") return;

        // 1. TOP CARDS / MAIN STATS
        updateText('total-deposit-display', format(data.totalSelfInvestment)); // Aapka total investment
        updateText('active-deposit', format(data.totalSelfInvestment)); 
        updateText('total-team-volume-display', format(data.totalTeamVolume)); // Team ka business
        
        // 2. EARNINGS
        const totalEarned = data.totalLevelIncome.add(data.totalLevelROIIncome);
        updateText('total-earned', format(totalEarned));
        updateText('level-earnings', format(data.totalLevelIncome));
        updateText('direct-earnings', format(data.totalLevelROIIncome)); 
        updateText('total-withdrawn', format(data.totalWithdrawn));
        
        // 3. WITHDRAWAL SECTION
        updateText('withdrawable-display', format(data.availableWithdrawable));
        updateText('ref-balance-display', format(data.workingBalance));
        updateText('compounding-balance', format(data.pendingMaturity)); // Maturity tak kitna aana baki hai

        // 4. TEAM STATS
        updateText('team-count', data.totalTeam.toString());
        updateText('direct-count', data.directCount.toString());
        updateText('active-members', data.teamActive.toString());
        updateText('inactive-members', data.teamInactive.toString());

        // 5. STATUS BADGE LOGIC
        const activeAmt = parseFloat(format(data.totalSelfInvestment));
        updateText('cp-display', activeAmt.toFixed(4));
        const statusBadge = document.getElementById('status-badge');
        if(statusBadge) {
            const isActive = activeAmt > 0;
            statusBadge.innerText = isActive ? "● Active Status" : "● Inactive Status";
            statusBadge.className = isActive 
                ? "px-4 py-1 rounded-full bg-green-500/20 text-green-500 text-[10px] font-black border border-green-500/30 uppercase"
                : "px-4 py-1 rounded-full bg-red-500/20 text-red-500 text-[10px] font-black border border-red-500/30 uppercase animate-pulse";
        }

        // 6. REFERRAL LINK
        const currentUrl = window.location.href.split('?')[0];
        const pageName = currentUrl.substring(currentUrl.lastIndexOf('/') + 1);
        const baseUrl = currentUrl.replace(pageName, 'register.html');
        const refUrl = `${baseUrl}?ref=${data.username}`;
        if(document.getElementById('refURL')) document.getElementById('refURL').value = refUrl;

    } catch (err) { 
        console.error("Dashboard Fetch Error:", err); 
    }
}

window.loadLevelData = async function(level) {
    if (!(await ensureConnection())) return;
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

// Ye initialization logic dusre code jaisa hai jo 100% stable hai
window.addEventListener('load', () => {
    setTimeout(init, 500); 
});







