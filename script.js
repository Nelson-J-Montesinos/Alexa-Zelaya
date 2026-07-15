const API_URL =
  "https://script.google.com/macros/s/AKfycbz47WpdrpCU924k9a3kKtTXkn1C9Xknoa11dDaBeWOd70-cFm5fb7F5UxEN7t2DFHwg/exec";

let userPassword = sessionStorage.getItem("app_pw") || "";

document.addEventListener("DOMContentLoaded", () => {
  if (userPassword) {
    showApp();
  } else {
    showLogin();
  }
});

// Manage Views
function showLogin() {
  document.getElementById("loginScreen").style.display = "block";
  document.getElementById("appContainer").style.display = "none";
}

function showApp() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appContainer").style.display = "block";
  loadData();
}

// Handle Login Form
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  userPassword = document.getElementById("appPassword").value;
  showApp();
});

function logout() {
  sessionStorage.removeItem("app_pw");
  userPassword = "";
  document.getElementById("appPassword").value = "";
  document.getElementById("usersTable").style.display = "none";
  showLogin();
}

// Fetch Data
async function loadData() {
  const loadingDiv = document.getElementById("loading");
  const tableEl = document.getElementById("usersTable");
  const errorMsg = document.getElementById("loginError");

  loadingDiv.style.display = "block";
  tableEl.style.display = "none";
  errorMsg.style.display = "none";

  try {
    // We pass the password securely to the Google Apps Script via query params
    const response = await fetch(
      `${API_URL}?password=${encodeURIComponent(userPassword)}`,
      {
        method: "GET",
        redirect: "follow",
      },
    );

    const result = await response.json();

    if (result.status === "unauthorized") {
      // If the password was wrong, clear memory and kick them back to login
      logout();
      errorMsg.innerText = "Incorrect Password.";
      errorMsg.style.display = "block";
      return;
    }

    if (result.status === "success") {
      // Save valid password for the rest of the browser session
      sessionStorage.setItem("app_pw", userPassword);

      const tbody = document.getElementById("tableBody");
      tbody.innerHTML = "";

      result.data.forEach((user) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td>${user.name}</td>
                    <td>${user.phone}</td>
                    <td>$${parseFloat(user.startingBalance).toFixed(2)}</td>
                    <td id="balance-${user.row}">$${parseFloat(user.currentBalance).toFixed(2)}</td>
                    <td>
                        <button onclick="openModal(${user.row}, '${user.name}', ${user.currentBalance})">
                            Log Purchase
                        </button>
                    </td>
                `;
        tbody.appendChild(tr);
      });

      loadingDiv.style.display = "none";
      tableEl.style.display = "table";
    }
  } catch (error) {
    loadingDiv.innerText =
      "Network Error. Could not establish contact with Google Sheets.";
    console.error("Error fetching data:", error);
  }
}

// Modal Logic
const modal = document.getElementById("purchaseModal");

function openModal(row, name, currentBalance) {
  document.getElementById("userRow").value = row;
  document.getElementById("userName").value = name;
  document.getElementById("userCurrentBalance").value = currentBalance;
  document.getElementById("modalTitle").innerText = `Purchase for ${name}`;

  document.getElementById("description").value = "";
  document.getElementById("amount").value = "";

  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

// Submit transaction
document
  .getElementById("purchaseForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    const payload = {
      password: userPassword, // Authenticate POST request
      row: document.getElementById("userRow").value,
      name: document.getElementById("userName").value,
      currentBalance: parseFloat(
        document.getElementById("userCurrentBalance").value,
      ),
      description: document.getElementById("description").value,
      amount: parseFloat(document.getElementById("amount").value),
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.status === "success") {
        const balanceCell = document.getElementById(`balance-${payload.row}`);
        balanceCell.innerText = `$${result.newBalance.toFixed(2)}`;

        const buttonCell = balanceCell.nextElementSibling;
        buttonCell.innerHTML = `<button onclick="openModal(${payload.row}, '${payload.name}', ${result.newBalance})">Log Purchase</button>`;

        closeModal();
      } else if (result.status === "unauthorized") {
        alert("Session expired or password is invalid. Logging out.");
        logout();
      } else {
        alert("Error recording purchase: " + result.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to connect to the database.");
    } finally {
      submitBtn.innerText = "Submit Purchase";
      submitBtn.disabled = false;
    }
  });
