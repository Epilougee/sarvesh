/* Faculty & Timetable Management - Vanilla JavaScript */

document.addEventListener("DOMContentLoaded", function () {
  // 1. Mobile Sidebar Toggle
  const mobileToggle = document.getElementById("mobileToggle");
  const sidebar = document.getElementById("sidebar");

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", function () {
      sidebar.classList.toggle("mobile-open");
    });

    // Close when clicking outside on mobile
    document.addEventListener("click", function (e) {
      if (
        sidebar.classList.contains("mobile-open") &&
        !sidebar.contains(e.target) &&
        !mobileToggle.contains(e.target)
      ) {
        sidebar.classList.remove("mobile-open");
      }
    });
  }

  // 2. Modal Open & Close logic
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      const firstInput = modal.querySelector("input:not([type=hidden]), select");
      if (firstInput) firstInput.focus();
    }
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
    }
  };

  // Close modals on clicking backdrop
  document.querySelectorAll(".modal-backdrop").forEach(function (backdrop) {
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) {
        backdrop.classList.remove("active");
      }
    });
  });

  // Close modal on Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-backdrop.active").forEach(function (modal) {
        modal.classList.remove("active");
      });
    }
  });

  // 3. Flash alert dismiss button
  document.querySelectorAll(".flash-close").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const alert = this.closest(".flash-alert");
      if (alert) alert.remove();
    });
  });

  // 4. Timetable Builder: Click empty cell to open assign modal
  document.querySelectorAll(".cell-empty").forEach(function (cell) {
    cell.addEventListener("click", function () {
      const day = this.dataset.day;
      const timeslotId = this.dataset.timeslotId;
      const timeslotLabel = this.dataset.timeslotLabel;

      const dayInput = document.getElementById("slot_day");
      const timeslotInput = document.getElementById("slot_timeslot_id");
      const displayDaySlot = document.getElementById("slot_display_info");

      if (dayInput) dayInput.value = day;
      if (timeslotInput) timeslotInput.value = timeslotId;
      if (displayDaySlot) {
        displayDaySlot.textContent = day + " - " + timeslotLabel;
      }

      openModal("addSlotModal");
    });
  });

  // 5. Delete Confirmations
  document.querySelectorAll("form.confirm-delete").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      const message = this.dataset.confirmMessage || "Are you sure you want to delete this record? This action cannot be undone.";
      if (!confirm(message)) {
        e.preventDefault();
      }
    });
  });
});

