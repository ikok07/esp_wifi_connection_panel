window.onload = async () => {
    await fetchConnectionStatus();
}

const connInfoContainer = document.querySelector(".connection-info--container");
const apsList = document.querySelector(".available-aps--container");
const connectionFormInputs = document.querySelector(".connection-form--inputs");

function hide(containers) {
    containers.forEach(container => {
        container.classList.add("hidden");
    })
}

function show(containers) {
    containers.forEach(container => {
        container.classList.remove("hidden");
    })
}

async function fetchConnectionStatus() {
    const connIcon = document.querySelector(".connection-status-icon");
    const connLabel = document.getElementById("connection-status")
    const url = "http://192.168.0.1/remote/ap/connection"
    try {
        const res = await fetch(url);
        if (!res.ok) {
            connIcon.src = "img/loading.svg"
            connLabel.textContent = "Undefined"
            return;
        }
        const body = await res.json();

        switch (body.wifi_status) {
            case 1:
                connIcon.src = "img/loading.svg";
                connLabel.textContent = "Undefined";
                break;
            case 2:
                connIcon.src = "img/connected.svg"
                connLabel.textContent = "Connected"
                connLabel.classList.remove("loading");
                connLabel.classList.remove("fail");
                connLabel.classList.add("ok");
                displayConnectionInfo(body.ssid, body.signal_strength);
                break;
            case 3:
                connIcon.src = "img/disconnected.svg"
                connLabel.textContent = "Disconnected"
                connLabel.classList.remove("loading");
                connLabel.classList.remove("ok");
                connLabel.classList.add("fail");
                await fetchAvailableNetworks();
                break;
            default: break;
        }
    } catch (err) {
        connLabel.textContent = "ESP32 Unavailable"
    }
}

async function fetchAvailableNetworks() {
    const networksList = document.querySelector(".available-aps--list");
    hide([connectionFormInputs, connInfoContainer]);
    show([apsList]);
    const loadingMsg = `<h3 class="loading">Loading available networks...</h3>`;
    const failMsg = `<h3 class="fail">Failed to fetch available networks!</h3>`;
    try {
        networksList.innerHTML = loadingMsg
        const res = await fetch("http://192.168.0.1/remote/ap");
        if (!res.ok) {
            networksList.innerHTML = failMsg
        }
        const body = await res.json();
        let availableNetworksHTML = ""
        body.available_networks.forEach(network => {

            let signalImg;
            if (network.signal_strength >= -90)
                signalImg = "signal-3.svg";
            else if (network.signal_strength < -90 && network.signal_strength > -100)
                signalImg = "signal-2.svg";
            else signalImg = "signal-1.svg";

            const clickFn = `displayFormInputs("${network.ssid}")`;
            availableNetworksHTML += `<div class="available-ap" onclick=${clickFn}>
                        <img src="img/${signalImg}" class="signal-img"/>
                        <div class="ap-info">
                            <strong>${network.ssid}</strong>
                            <small>Signal: ${network.signal_strength} dBm</small>
                        </div>
                        <img src="img/angle-right.svg" class="angle"/>
                    </div>`
        })
        networksList.innerHTML = availableNetworksHTML;
    } catch(err) {
        networksList.innerHTML = failMsg
    }
}

async function connectWifi() {
    const connectBtn = document.querySelector("#connect-btn");
    const ssid = document.getElementById("target-ap").textContent;
    const password = document.getElementById("wifi-pass-input").value;
    try {
        connectBtn.disabled = true;
        connectBtn.classList.add("inactive");
        connectBtn.textContent = "Connecting...";
        let res = await fetch("http://192.168.0.1/remote/ap/connect", {
            method: "POST",
            body: JSON.stringify({
                ssid, password
            })
        })
        if (res.ok) await fetchConnectionStatus();
        connectBtn.disabled = false;
        connectBtn.classList.remove("inactive");
        connectBtn.textContent = "Failed to connect. Press to try again.";
    } catch (err) {
        connectBtn.disabled = false;
        connectBtn.classList.remove("inactive");
        connectBtn.textContent = "Failed to connect. Press to try again.";
    }
}

async function disconnectWifi() {
    const disconnectBtn = document.querySelector("#disconnect-btn");
    try {
        disconnectBtn.classList.remove("destructive");
        disconnectBtn.disabled = true;
        disconnectBtn.classList.add("inactive");
        disconnectBtn.textContent = "Disconnecting...";
        const res = await fetch("http://192.168.0.1/remote/ap/disconnect", {
            method: "POST"
        })
        if (!res.ok) {
            disconnectBtn.disabled = false;
            disconnectBtn.classList.remove("inactive");
            disconnectBtn.classList.add("destructive");
            disconnectBtn.textContent = "Failed to disconnect. Press to try again";
        }
        hide([connInfoContainer, connectionFormInputs]);
        show([apsList])
        await fetchConnectionStatus();
    } catch(err) {
        disconnectBtn.disabled = false;
        disconnectBtn.classList.remove("inactive");
        disconnectBtn.classList.add("destructive");
        disconnectBtn.textContent = "Failed to disconnect. Press to try again";
    }
}

function displayConnectionInfo(ssid, signalStrength) {
    const ssidField = document.getElementById("connected-ssid");
    const strengthField = document.getElementById("connected-signal");
    ssidField.textContent = ssid;
    strengthField.textContent = `${signalStrength} dBm`;
    show([connInfoContainer]);
    hide([connectionFormInputs, apsList]);
}

function displayFormInputs(ssid) {
    const ssidLabel = document.getElementById("target-ap");
    ssidLabel.textContent = ssid;
    hide([connInfoContainer, apsList]);
    show([connectionFormInputs]);
}

function checkForValidPassword() {
    const input = document.getElementById("wifi-pass-input")
    const connectBtn = document.getElementById("connect-btn");
    if (input.value.length >= 8) {
        connectBtn.classList.remove("inactive");
        connectBtn.disabled = false;
        return;
    }
    connectBtn.classList.add("inactive");
    connectBtn.disabled = true;
}