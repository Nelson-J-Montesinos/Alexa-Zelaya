// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
const API_URL =
  "https://script.google.com/macros/s/AKfycbyC4j7hUARMNGiHGHCf1ATYf9ktKM-cHrvadj9Tw0On7qZyZ3a-8ZBjumovYP-omGM/exec";

document.addEventListener("DOMContentLoaded", loadData);

async function loadData() {
  try {
    const response = await fetch(API_URL);
    const users = await response.json();

    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    users.forEach((user) => {
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

    document.getElementById("loading").style.display = "none";
    document.getElementById("usersTable").style.display = "table";
  } catch (error) {
    document.getElementById("loading").innerText =
      "Error loading data. Check the console and ensure your API URL is correct.";
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

// Handle Form Submission
document
  .getElementById("purchaseForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    const payload = {
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
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.status === "success") {
        // Update the UI immediately without reloading the page
        const balanceCell = document.getElementById(`balance-${payload.row}`);
        balanceCell.innerText = `$${result.newBalance.toFixed(2)}`;

        // Update the click handler so the next purchase uses the new balance
        const buttonCell = balanceCell.nextElementSibling;
        buttonCell.innerHTML = `<button onclick="openModal(${payload.row}, '${payload.name}', ${result.newBalance})">Log Purchase</button>`;

        closeModal();
      } else {
        alert("Error recording purchase.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to connect to the database.");
    } finally {
      submitBtn.innerText = "Submit Purchase";
      submitBtn.disabled = false;
    }
  });
