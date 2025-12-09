document.addEventListener('DOMContentLoaded', () => {
   // --- Carousel Logic ---
   const slides = document.querySelectorAll('.carousel-slide');
   const prevBtn = document.getElementById('prevBtn');
   const nextBtn = document.getElementById('nextBtn');
   let currentSlide = 0;

   function showSlide(index) {
      if (index >= slides.length) {
         currentSlide = 0;
      } else if (index < 0) {
         currentSlide = slides.length - 1;
      } else {
         currentSlide = index;
      }

      slides.forEach(slide => {
         slide.classList.remove('active');
      });
      slides[currentSlide].classList.add('active');

      // Update Rewards based on current slide (Order)
      updateRewards(currentSlide);
   }

   function updateRewards(orderIndex) {
      if (selectedPeriodIndex >= eventData.length) return;
      const currentOrders = eventData[selectedPeriodIndex].orders;

      if (currentOrders && currentOrders[orderIndex]) {
         const rewards = currentOrders[orderIndex].rewards;
         rewardsContainer.innerHTML = '';

         if (rewards) {
            rewards.forEach(reward => {
               const rewardEl = document.createElement('div');
               rewardEl.className = 'reward-item';
               rewardEl.innerHTML = `
                        <div class="reward-wrapper">
                            ${reward.bg ? `<img src="${reward.bg}" class="reward-bg" alt="bg">` : ''}
                            <img src="${reward.img}" class="reward-img" alt="${reward.name}">
                        </div>
                        ${reward.count ? `<span class="reward-count">${reward.count}</span>` : ''}
                    `;
               rewardsContainer.appendChild(rewardEl);
            });
         }
      }
   }

   prevBtn.addEventListener('click', () => {
      showSlide(currentSlide - 1);
   });

   nextBtn.addEventListener('click', () => {
      showSlide(currentSlide + 1);
   });

   // --- Dynamic Content & Timer Logic ---
   const timerElement = document.getElementById('timer');
   const rewardsContainer = document.getElementById('rewardsContainer');
   const dayButtons = document.querySelectorAll('.day-btn');

   // Check if eventData exists
   const eventData = window.eventData;
   if (!eventData) {
      console.error("eventData not found on window object. Make sure data.js is loaded.");
      return;
   }

   // State Tracking
   // currentRealPeriodIndex: The actual period based on time passed
   // selectedPeriodIndex: The period user wants to view
   let currentRealPeriodIndex = parseInt(localStorage.getItem('event_period_index')) || 0;
   let selectedPeriodIndex = currentRealPeriodIndex;

   // --- Persistent Timer Implementation (Targets Next 10 AM) ---
   function getNextTargetTime() {
      const now = new Date();
      const target = new Date();
      target.setDate(now.getDate() + 1); // Tomorrow
      target.setHours(10, 0, 0, 0); // 10:00:00
      return target.getTime();
   }

   let targetTime = localStorage.getItem('event_target_date');

   if (!targetTime) {
      targetTime = getNextTargetTime();
      localStorage.setItem('event_target_date', targetTime);
      localStorage.setItem('event_period_index', currentRealPeriodIndex);
   } else {
      targetTime = parseInt(targetTime);
   }

   let timerInterval;

   function formatTime(milliseconds) {
      if (milliseconds < 0) milliseconds = 0;
      let seconds = Math.floor(milliseconds / 1000);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      const hDisplay = h < 10 ? '0' + h : h;
      const mDisplay = m < 10 ? '0' + m : m;
      const sDisplay = s < 10 ? '0' + s : s;
      return `${hDisplay}:${mDisplay}:${sDisplay}`;
   }

   // --- Day Selection UI ---
   dayButtons.forEach(btn => {
      btn.addEventListener('click', () => {
         const dayIndex = parseInt(btn.getAttribute('data-day'));
         selectDay(dayIndex);
      });
   });

   function selectDay(index) {
      if (index >= eventData.length) return;
      selectedPeriodIndex = index;

      // Update Buttons UI
      dayButtons.forEach(btn => {
         btn.classList.toggle('active', parseInt(btn.getAttribute('data-day')) === index);
      });

      updateContent(selectedPeriodIndex);
      updateTimerDisplay(); // Immediately update timer text based on selection
   }

   function updateContent(periodIndex) {
      if (periodIndex >= eventData.length) return;

      const data = eventData[periodIndex];

      // Update Carousel Items
      data.orders.forEach((order, index) => {
         const slide = document.getElementById(`slide-${index}`);
         if (slide) {
            // Update Title
            const titleEl = slide.querySelector('.section-title');
            if (titleEl) titleEl.textContent = order.title;

            // Update Content
            const contentEl = slide.querySelector('.slide-content');
            if (contentEl) {
               let itemsHtml = '<div class="items-grid">';
               order.items.forEach(item => {
                  itemsHtml += `
                           <div class="item-container-inner">
                                <div class="item-wrapper">
                                    <img src="${item.bg}" class="item-bg" alt="bg">
                                    <img src="${item.img}" class="item-img" alt="${item.name}">
                                </div>
                                <div class="item-info">
                                    <span class="item-count">${item.count}</span>
                                </div>
                           </div>
                        `;
               });
               itemsHtml += '</div>';
               contentEl.innerHTML = itemsHtml;
            }
         }
      });

      // Initialize Rewards for the first slide of the new period
      currentSlide = 0;
      showSlide(0);
   }

   function updateTimerDisplay() {
      const now = new Date().getTime();
      let timerText = "";
      let prefix = "";

      // User wants countdown logic for the selected day regardless of past/future status
      // "como se secuencia regresiva que me muestre las horas restantes para el dia que seleccione"

      // Calculate target end time for the SELECTED day
      // Base calculation: current targetTime is for currentRealPeriodIndex
      // Diff in days = selected - current
      // Target for selected day = targetTime + (daysDiff * 24h)
      // Since targetTime is END of current day, targetForSelected is END of selected day

      let daysDiff = selectedPeriodIndex - currentRealPeriodIndex;
      let targetForSelectedDay = targetTime + (daysDiff * 24 * 3600 * 1000);
      let distance = targetForSelectedDay - now;

      if (selectedPeriodIndex === currentRealPeriodIndex) {
         // Current Day
         prefix = "Tiempo restante: ";
         timerText = formatTime(Math.max(0, distance));
      } else if (selectedPeriodIndex > currentRealPeriodIndex) {
         // Future Day: User wants "hours remaining for the day selected"
         // Usually means "Starts In". But "runs with the remaining" might mean until it ENDS?
         // Standard logic: "Comienza en" (Time until PREVIOUS day ends).
         // Time until START of selected day = targetForSelectedDay - 24h - now
         let timeUntilStart = distance - (24 * 3600 * 1000);
         prefix = "Comienza en: ";
         timerText = formatTime(Math.max(0, timeUntilStart));
      } else {
         // Past Day
         // "even when selecting past days but time only runs with the remaining"
         // If a day is past, remaining time is 0. 
         prefix = "Estado: ";
         timerText = "Finalizado";
      }

      document.querySelector('.card-subtitle').innerHTML = `${prefix}<span id="timer">${timerText}</span>`;
   }

   function startTimer() {
      if (timerInterval) clearInterval(timerInterval);

      timerInterval = setInterval(() => {
         const now = new Date().getTime();

         // Logic to advance REAL day
         if (now >= targetTime) {
            currentRealPeriodIndex++;
            if (currentRealPeriodIndex < eventData.length) {
               const newTargetDate = new Date(targetTime);
               newTargetDate.setDate(newTargetDate.getDate() + 1);
               targetTime = newTargetDate.getTime();
               localStorage.setItem('event_target_date', targetTime);
               localStorage.setItem('event_period_index', currentRealPeriodIndex);

               // When day advances, always switch view to the new current day
               // as per user request: "terminando las 12 horas que el dia 2 sea el dia por defecto"
               selectDay(currentRealPeriodIndex);
            } else {
               // Event Over
               localStorage.removeItem('event_target_date');
               updateTimerDisplay(); // Past event logic
               clearInterval(timerInterval); // Stop timer
               return;
            }
         } else {
            updateTimerDisplay();
         }
      }, 1000);
   }

   // Initialize
   selectDay(currentRealPeriodIndex); // Start viewing current day
   startTimer();
});
