/* =====================================================
   HERD SUMMARY
===================================================== */

const herdSummary = { total: 10, normal: 6, warning: 3, critical: 1, offline: 1 };


/* =====================================================
   CATTLE DATA
===================================================== */

const cattle = [

  {
    id: 'C001',
    hr: 72,
    temp: 38.4,

    rum: 'Normal',
    rumPct: 78,
    rumMinutes: 468,
    status: 'Normal',
    battery: 82,
    device: 'C001',
    deviceStatus: 'Online',

    recordedAt: null
  },

  {
    id: 'C002',
    hr: 105,
    temp: 39.6,

    rum: 'Normal',
    rumPct: 75,
    rumMinutes: 455,
    status: 'Warning',
    battery: 68,
    device: 'C002',
    deviceStatus: 'Online',

    recordedAt: null
  },

  {
    id: 'C003',
    hr: 64,
    temp: 38.2,

    rum: 'Normal',
    rumPct: 80,
    rumMinutes: 482,
    status: 'Normal',
    battery: 75,
    device: 'C003',
    deviceStatus: 'Online',

    recordedAt: null
  },

  {
    id: 'C004',
    hr: 90,
    temp: 39.0,

    rum: 'Rendah',
    rumPct: 48,
    rumMinutes: 285,
    status: 'Warning',
    battery: 55,
    device: 'C004',
    deviceStatus: 'Online',

    recordedAt: null
  },

  {
    id: 'C005',
    hr: 112,
    temp: 40.1,

    rum: 'Rendah',
    rumPct: 39,
    rumMinutes: 238,
    status: 'Critical',
    battery: 42,
    device: 'C005',
    deviceStatus: 'Warning',

    recordedAt: null
  },

  {
    id: 'C006',
    hr: 67,
    temp: 38.3,

    rum: 'Normal',
    rumPct: 77,
    rumMinutes: 460,
    status: 'Normal',
    battery: 88,
    device: 'C006',
    deviceStatus: 'Online',

    recordedAt: null
  },

  {
    id: 'C007',
    hr: 76,
    temp: 38.5,

    rum: 'Normal',
    rumPct: 73,
    rumMinutes: 438,
    status: 'Normal',
    battery: 79,
    device: 'C007',
    deviceStatus: 'Online',

    recordedAt: null
  },

  {
    id: 'C008',
    hr: 96,
    temp: 39.1,

    rum: 'Rendah',
    rumPct: 45,
    rumMinutes: 271,
    status: 'Warning',
    battery: 66,
    device: 'C008',
    deviceStatus: 'Online',

    recordedAt: null
  },
  // Data contoh C009 dan C010; belum berasal dari alat.
  { id: 'C009', hr: 70, temp: 38.4, rum: 'Normal', rumPct: 76, rumMinutes: 456, status: 'Normal', battery: 81, device: 'C009', deviceStatus: 'Online', recordedAt: null },
  { id: 'C010', hr: 69, temp: 38.3, rum: 'Normal', rumPct: 74, rumMinutes: 444, status: 'Normal', battery: 10, device: 'C010', deviceStatus: 'Offline', recordedAt: null }

];


/* =====================================================
   REAL-TIME STATE
===================================================== */

let selectedCowId = 'C001';

let healthHistory = {};


/* =====================================================
   ALERT DATA
===================================================== */

const alertData = [

  {
    tone: 'red',
    title: 'C002 - Heart Rate Tinggi',
    desc: 'HR 105 bpm berada di atas threshold monitoring.',
    time: '10:25',
    cowId: 'C002'
  },

  {
    tone: 'orange',
    title: 'C004 - Ruminasi Menurun',
    desc: 'Ruminasi 285 menit/hari, lebih rendah dari baseline.',
    time: '10:23',
    cowId: 'C004'
  },

  {
    tone: 'blue',
    title: 'C005 - Status Perangkat Perlu Diperiksa',
    desc: 'Perangkat wearable mendeteksi kondisi yang perlu dipantau.',
    time: '10:15',
    cowId: 'C005'
  },

  {
    tone: 'red',
    title: 'Kandang - Kondisi Gas Perlu Dipantau',
    desc: 'Konsentrasi gas kandang perlu dipantau.',
    time: '09:58',
    cowId: null
  }

];


/* =====================================================
   DEVICE DATA
===================================================== */

const deviceData = cattle.map(cow => [
  `Wearable ${cow.id}`, 'ESP32 Wearable', `${cow.battery}%`,
  cow.deviceStatus === 'Offline' ? '18 menit' : '3 detik', cow.deviceStatus
]);
deviceData.push(['Sensor Kandang A', 'ESP32 Environment', 'AC', '2 detik', 'Online']);


/* =====================================================
   HELPER SET TEXT
===================================================== */

function setText(selector, value) {

  const element =
    document.querySelector(selector);

  if (element) {

    element.textContent =
      value;

  }

}


/* =====================================================
   STATUS HELPER
===================================================== */

function statusClass(status) {

  if (
    status === 'Normal' ||
    status === 'Online'
  ) {

    return 'normal';

  }

  if (
    status === 'Warning'
  ) {

    return 'warning';

  }

  return 'critical';

}


/* =====================================================
   HEALTH BADGE
===================================================== */

function cowStatusBadgeClass(status) {

  if (
    status === 'Normal'
  ) {

    return 'status-normal';

  }

  if (
    status === 'Warning'
  ) {

    return 'status-warning';

  }

  return 'status-critical';

}


/* =====================================================
   TIME FORMAT
===================================================== */

function formatTime(
  date = new Date()
) {

  return date.toLocaleTimeString(
    'id-ID',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
  );

}


/* =====================================================
   DATABASE TIME FORMAT
===================================================== */

function formatDatabaseTime(value) {

  if (!value) {

    return formatTime();

  }


  const parsed =
    new Date(
      String(value)
        .replace(
          ' ',
          'T'
        )
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {

    return value;

  }


  return parsed.toLocaleString(
    'id-ID',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
  );

}


/* =====================================================
   HEALTH STATUS
===================================================== */

function updateHealthStatus(cow) {

  const hrInput =
    document.querySelector(
      '#settingHr'
    );

  const tempInput =
    document.querySelector(
      '#settingTemp'
    );


  const hrWarning =
    hrInput
      ? Number(hrInput.value)
      : 95;


  const tempWarning =
    tempInput
      ? Number(tempInput.value)
      : 39.5;


  if (
    cow.hr >= 110 ||
    cow.temp >= 40.0
  ) {

    cow.status =
      'Critical';

  }

  else if (
    cow.hr >= hrWarning ||
    cow.temp >= tempWarning
  ) {

    cow.status =
      'Warning';

  }

  else {

    cow.status =
      'Normal';

  }

}


/* =====================================================
   LOAD HEALTH DATA
   API KESEHATAN TIDAK DIUBAH
===================================================== */

async function loadHealthData() {

  try {

    const response =
      await fetch(
        'api-test.php?t=' +
        Date.now(),
        {
          cache: 'no-store'
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const result =
      await response.json();


    if (
      result.status !== 'success' ||
      !Array.isArray(result.data)
    ) {

      console.error(
        'Format API kesehatan tidak sesuai:',
        result
      );

      return;

    }


    const rows =
      result.data;


    healthHistory = {};


    rows.forEach(
      row => {

        const deviceId =
          String(
            row.device_id
          ).trim();


        if (
          !healthHistory[
            deviceId
          ]
        ) {

          healthHistory[
            deviceId
          ] = [];

        }


        healthHistory[
          deviceId
        ].push(
          row
        );

      }
    );


    const latestByDevice =
      new Map();


    rows.forEach(
      row => {

        const deviceId =
          String(
            row.device_id
          ).trim();


        if (
          !latestByDevice.has(
            deviceId
          )
        ) {

          latestByDevice.set(
            deviceId,
            row
          );

        }

      }
    );


    latestByDevice.forEach(
      (
        row,
        deviceId
      ) => {


        const cow =
          cattle.find(
            item =>
              item.id ===
              deviceId
          );


        if (!cow) {

          console.warn(
            'Device belum terdaftar:',
            deviceId
          );

          return;

        }


        const heartRate =
          Number(
            row.heart_rate
          );


        const bodyTemperature =
          Number(
            row.body_temperature
          );


        if (
          Number.isFinite(
            heartRate
          )
        ) {

          cow.hr =
            heartRate;

        }


        if (
          row.body_temperature !== null &&
          row.body_temperature !== '' &&
          Number.isFinite(
            bodyTemperature
          )
        ) {

          cow.temp =
            bodyTemperature;

        }


        cow.recordedAt =
          row.recorded_at;


        cow.deviceStatus =
          'Online';


        updateHealthStatus(
          cow
        );

      }
    );


    renderCattle();


    if (
      selectedCowId
    ) {

      selectCow(
        selectedCowId
      );

    }


    console.log(
      'Health update berhasil:',
      rows
    );

  }

  catch (error) {

    console.error(
      'Gagal mengambil data kesehatan:',
      error
    );

  }

}


/* =====================================================
   LOAD ENVIRONMENT DATA
   API BARU:
   api-environment.php
===================================================== */

async function loadEnvironmentData() {

  try {

    const response =
      await fetch(
        'api-environment.php?t=' +
        Date.now(),
        {
          cache: 'no-store'
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const result =
      await response.json();


    if (
      result.status !== 'success' ||
      !result.data
    ) {

      console.error(
        'Format API lingkungan tidak sesuai:',
        result
      );

      return;

    }


    const data =
      result.data;


    const temperature =
      Number(
        data.temperature
      );


    const humidity =
      Number(
        data.humidity
      );


    const ch4 =
      Number(
        data.ch4_ppm
      );


    if (
      !Number.isFinite(
        temperature
      ) ||
      !Number.isFinite(
        humidity
      ) ||
      !Number.isFinite(
        ch4
      )
    ) {

      console.error(
        'Data lingkungan bukan angka valid:',
        data
      );

      return;

    }


    /* =================================================
       DASHBOARD UTAMA
    ================================================= */

    setText(
      '#overviewEnvTemp',
      `${temperature.toFixed(1)} °C`
    );


    setText(
      '#overviewEnvHumidity',
      `${humidity.toFixed(1)} %RH`
    );


    setText(
      '#overviewEnvCh4',
      `${ch4.toFixed(1)} ppm`
    );


    /* =================================================
       HALAMAN LINGKUNGAN
    ================================================= */

    setText(
      '#envTemperature',
      `${temperature.toFixed(1)} °C`
    );


    setText(
      '#envHumidity',
      `${humidity.toFixed(1)} %RH`
    );


    setText(
      '#envCh4',
      `${ch4.toFixed(1)} ppm`
    );


    console.log(
      'Environment update berhasil:',
      data
    );

  }

  catch (error) {

    console.error(
      'Gagal mengambil data lingkungan:',
      error
    );

  }

}


/* =====================================================
   SUMMARY
===================================================== */

function renderSummary() {

  setText(
    '#kpiCritical',
    herdSummary.critical
  );

  setText(
    '#kpiWarning',
    herdSummary.warning
  );

  setText(
    '#kpiOffline',
    herdSummary.offline
  );

  setText(
    '#kpiNormal',
    herdSummary.normal
  );

  setText(
    '#kpiTotal',
    herdSummary.total
  );

  setText(
    '#navAlertCount',
    alertData.length
  );

  setText(
    '#notifCount',
    alertData.length
  );

}


/* =====================================================
   ALERT TEMPLATE
===================================================== */

function alertTemplate(
  alert,
  includeAction = false
) {

  const actionButton =
    includeAction &&
    alert.cowId

      ? `
        <button
          class="alert-action"
          data-cow-alert="${alert.cowId}"
        >
          Buka Sapi →
        </button>
      `

      : '';


  return `

    <div class="alert ${alert.tone}">

      <i></i>

      <div>

        <b>
          ${alert.title}
        </b>

        <small>
          ${alert.desc}
        </small>

        ${actionButton}

      </div>

      <time>
        ${alert.time}
      </time>

    </div>

  `;

}


/* =====================================================
   RENDER ALERT
===================================================== */

function renderAlerts() {

  const overviewAlerts =
    document.querySelector(
      '#overviewAlerts'
    );


  if (overviewAlerts) {

    overviewAlerts.innerHTML =

      alertData
        .slice(0, 4)
        .map(
          alert =>
            alertTemplate(
              alert,
              true
            )
        )
        .join('');

  }


  const allAlerts =
    document.querySelector(
      '#allAlerts'
    );


  if (allAlerts) {

    allAlerts.innerHTML =

      alertData
        .map(
          alert =>
            alertTemplate(
              alert,
              true
            )
        )
        .join('');

  }


  document
    .querySelectorAll(
      '[data-cow-alert]'
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            const cowId =
              button.dataset.cowAlert;


            showPage(
              'cattle'
            );


            renderCattle();


            selectCow(
              cowId
            );

          };

      }
    );

}


/* =====================================================
   RENDER CATTLE TABLE
===================================================== */

function renderCattle() {

  const searchElement =
    document.querySelector(
      '#cowSearch'
    );


  const filterElement =
    document.querySelector(
      '#statusFilter'
    );


  const search =
    searchElement
      ? searchElement.value.toLowerCase()
      : '';


  const filter =
    filterElement
      ? filterElement.value
      : 'all';


  const list =

    cattle.filter(
      cow =>

        cow.id
          .toLowerCase()
          .includes(search)

        &&

        (
          filter === 'all' ||
          cow.status === filter
        )
    );


  const cowTable =
    document.querySelector(
      '#cowTable'
    );


  if (!cowTable) {

    return;

  }


  cowTable.innerHTML =

    list
      .map(
        cow => `

          <tr data-id="${cow.id}">

            <td>
              <b>${cow.id}</b>
            </td>

            <td
              class="${
                cow.hr >= 100
                  ? 'critical'
                  : ''
              }"
            >
              ${cow.hr}
            </td>

            <td
              class="${
                cow.temp >= 39.5
                  ? 'critical'
                  : ''
              }"
            >
              ${Number(cow.temp).toFixed(1)}°
            </td>

            <td
              class="${statusClass(cow.status)}"
            >
              <b>${cow.status}</b>
            </td>

            <td>
              ${cow.battery}%
            </td>

          </tr>

        `
      )
      .join('');


  document
    .querySelectorAll(
      '#cowTable tr'
    )
    .forEach(
      row => {

        row.onclick =
          () =>
            selectCow(
              row.dataset.id
            );

      }
    );

}


/* =====================================================
   SELECT COW
===================================================== */

function selectCow(id) {

  selectedCowId =
    id;


  const cow =
    cattle.find(
      item =>
        item.id === id
    );


  if (!cow) {

    return;

  }


  document
    .querySelectorAll(
      '#cowTable tr'
    )
    .forEach(
      row => {

        row.classList.toggle(
          'selected',
          row.dataset.id === id
        );

      }
    );


  const now =

    cow.recordedAt

      ? formatDatabaseTime(
          cow.recordedAt
        )

      : formatTime();


  setText(
    '#detailTitle',
    `Sapi ${cow.id}`
  );


  setText(
    '#detailUpdate',
    `Terakhir update: ${now}`
  );


  const badge =
    document.querySelector(
      '#detailStatusBadge'
    );


  if (badge) {

    badge.textContent =
      `Health: ${cow.status}`;


    badge.className =
      `cow-main-status ${cowStatusBadgeClass(cow.status)}`;

  }


  setText(
    '#dHr',
    `${cow.hr} bpm`
  );


  setText(
    '#dHrState',

    cow.hr >= 95

      ? 'Di atas threshold'

      : 'Normal'
  );


  setText(
    '#dTemp',
    `${Number(cow.temp).toFixed(1)} °C`
  );


  setText(
    '#dTempState',

    cow.temp >= 39.5

      ? 'Suhu tinggi'

      : 'Normal'
  );



  setText(
    '#dRum',
    `${cow.rumMinutes} min`
  );


  setText(
    '#dRumPct',
    `${cow.rum} • ${cow.rumPct}% baseline`
  );


  const deviceStatus =
    document.querySelector(
      '#dDeviceStatus'
    );


  if (deviceStatus) {

    deviceStatus.textContent =
      cow.deviceStatus;


    deviceStatus.className =
      statusClass(
        cow.deviceStatus
      );

  }


  setText(
    '#dBatt',
    `${cow.battery}%`
  );


  setText(
    '#dBattState',

    cow.battery < 30

      ? 'Baterai rendah'

      : cow.battery < 60

        ? 'Baterai sedang'

        : 'Baterai normal'
  );


  setText(
    '#dSeen',
    now
  );


  setText(
    '#dDevice',
    cow.device
  );


  setText(
    '#dDeviceInfoStatus',
    cow.deviceStatus
  );



  setText(
    '#currentHrBadge',
    `${cow.hr} bpm`
  );


  /* ===================================================
     HEART RATE GRAPH
  ==================================================== */

  const history =
    healthHistory[id] || [];


  let heartRateHistory =

    [...history]
      .reverse()
      .map(
        row =>
          Number(
            row.heart_rate
          )
      )
      .filter(
        value =>
          Number.isFinite(
            value
          )
      );


  if (
    heartRateHistory.length === 1
  ) {

    heartRateHistory = [

      heartRateHistory[0],

      heartRateHistory[0]

    ];

  }


  if (
    heartRateHistory.length === 0
  ) {

    heartRateHistory = [

      Number(cow.hr),

      Number(cow.hr)

    ];

  }


  const points =

    heartRateHistory.map(
      (
        value,
        index
      ) => {


        const denominator =

          Math.max(
            1,
            heartRateHistory.length - 1
          );


        const x =

          (
            index /
            denominator
          )

          * 600;


        const safeValue =

          Math.max(

            40,

            Math.min(
              120,
              value
            )

          );


        const y =

          190

          -

          (
            (
              safeValue - 40
            )
            /
            80
          )

          *
          150;


        return (
          `${x.toFixed(1)},${y.toFixed(1)}`
        );

      }
    );


  const detailLine =
    document.querySelector(
      '#detailLine'
    );


  if (detailLine) {

    detailLine.setAttribute(
      'points',
      points.join(' ')
    );

  }


  setText(
    '#cattlePageUpdated',
    `Update terakhir ${now}`
  );

}


/* =====================================================
   RENDER DEVICES
===================================================== */

function renderDevices() {

  const table =
    document.querySelector(
      '#deviceTable'
    );


  if (!table) {

    return;

  }


  table.innerHTML =

    deviceData
      .map(
        device => `

          <tr>

            <td>
              <b>${device[0]}</b>
            </td>

            <td>
              ${device[1]}
            </td>

            <td>
              ${device[2]}
            </td>

            <td>
              ${device[3]}
            </td>

            <td
              class="${statusClass(device[4])}"
            >
              <b>${device[4]}</b>
            </td>

          </tr>

        `
      )
      .join('');

}


/* =====================================================
   PAGE NAVIGATION
===================================================== */

function showPage(name) {

  const target =
    document.querySelector(
      `#page-${name}`
    );


  if (!target) {

    return;

  }


  document
    .querySelectorAll(
      '.page'
    )
    .forEach(
      page => {

        page.classList.remove(
          'active'
        );

      }
    );


  target.classList.add(
    'active'
  );


  document
    .querySelectorAll(
      '.nav'
    )
    .forEach(
      nav => {

        nav.classList.toggle(
          'active',
          nav.dataset.page === name
        );

      }
    );


  if (
    window.innerWidth <
    1150
  ) {

    const sidebar =
      document.querySelector(
        '#sidebar'
      );


    if (sidebar) {

      sidebar.classList.remove(
        'open'
      );

    }

  }


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}


/* =====================================================
   NAV EVENT
===================================================== */

document
  .querySelectorAll(
    '.nav'
  )
  .forEach(
    nav => {

      nav.onclick =
        () =>
          showPage(
            nav.dataset.page
          );

    }
  );


/* =====================================================
   DATA JUMP
===================================================== */

document
  .querySelectorAll(
    '[data-jump]'
  )
  .forEach(
    button => {

      button.onclick =
        () =>
          showPage(
            button.dataset.jump
          );

    }
  );


/* =====================================================
   SEARCH
===================================================== */

const cowSearch =
  document.querySelector(
    '#cowSearch'
  );


if (cowSearch) {

  cowSearch.oninput =
    renderCattle;

}


/* =====================================================
   FILTER
===================================================== */

const statusFilter =
  document.querySelector(
    '#statusFilter'
  );


if (statusFilter) {

  statusFilter.onchange =
    renderCattle;

}


/* =====================================================
   MOBILE SIDEBAR
===================================================== */

const menuBtn =
  document.querySelector(
    '#menuBtn'
  );


if (menuBtn) {

  menuBtn.onclick =
    () => {

      const sidebar =
        document.querySelector(
          '#sidebar'
        );


      if (sidebar) {

        sidebar.classList.toggle(
          'open'
        );

      }

    };

}


/* =====================================================
   SETTINGS SAVE
===================================================== */

const saveSettings =
  document.querySelector(
    '#saveSettings'
  );


if (saveSettings) {

  saveSettings.onclick =
    () => {


      const settings = {

        hr:
          document
            .querySelector(
              '#settingHr'
            )
            ?.value,

        temp:
          document
            .querySelector(
              '#settingTemp'
            )
            ?.value,

        nh3:
          document
            .querySelector(
              '#settingNh3'
            )
            ?.value,

        interval:
          document
            .querySelector(
              '#settingInterval'
            )
            ?.value

      };


      localStorage.setItem(
        'smartcattle-settings',
        JSON.stringify(
          settings
        )
      );


      cattle.forEach(
        cow => {

          updateHealthStatus(
            cow
          );

        }
      );


      renderCattle();


      if (
        selectedCowId
      ) {

        selectCow(
          selectedCowId
        );

      }


      showToast(
        'Pengaturan berhasil disimpan.'
      );

    };

}


/* =====================================================
   LOAD SETTINGS
===================================================== */

function loadSettings() {

  const saved =
    localStorage.getItem(
      'smartcattle-settings'
    );


  if (!saved) {

    return;

  }


  try {

    const settings =
      JSON.parse(
        saved
      );


    if (settings.hr) {

      const element =
        document.querySelector(
          '#settingHr'
        );

      if (element) {
        element.value =
          settings.hr;
      }

    }


    if (settings.temp) {

      const element =
        document.querySelector(
          '#settingTemp'
        );

      if (element) {
        element.value =
          settings.temp;
      }

    }


    if (settings.nh3) {

      const element =
        document.querySelector(
          '#settingNh3'
        );

      if (element) {
        element.value =
          settings.nh3;
      }

    }


    if (settings.interval) {

      const element =
        document.querySelector(
          '#settingInterval'
        );

      if (element) {
        element.value =
          settings.interval;
      }

    }

  }

  catch (error) {

    console.error(
      'Gagal membaca pengaturan:',
      error
    );

  }

}


/* =====================================================
   REPORT BUTTON
===================================================== */

document
  .querySelectorAll(
    '.report-btn'
  )
  .forEach(
    button => {

      button.onclick =
        () =>

          showToast(
            'Prototype laporan: fungsi export akan dihubungkan ke backend.'
          );

    }
  );


/* =====================================================
   TOAST
===================================================== */

let toastTimer;


function showToast(message) {

  const toast =
    document.querySelector(
      '#toast'
    );


  if (!toast) {

    return;

  }


  toast.textContent =
    message;


  toast.classList.add(
    'show'
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          'show'
        );

      },
      2600
    );

}


/* =====================================================
   CLOCK
===================================================== */

function clock() {

  const now =
    new Date();


  setText(
    '#clockText',

    now.toLocaleTimeString(
      'id-ID',
      {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }
    )

  );


  setText(
    '#dateText',

    now.toLocaleDateString(
      'id-ID',
      {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    )

  );


  setText(
    '#overviewUpdated',
    formatTime(now)
  );

}


/* =====================================================
   INITIALIZATION
===================================================== */

setInterval(
  clock,
  1000
);


clock();

renderSummary();

renderAlerts();

renderCattle();

renderDevices();

loadSettings();


/* =====================================================
   DEFAULT DEVICE
===================================================== */

selectCow(
  'C001'
);


/* =====================================================
   LOAD PERTAMA KALI
===================================================== */

/*
  KESEHATAN
*/

loadHealthData();


/*
  LINGKUNGAN
*/

loadEnvironmentData();


/* =====================================================
   REFRESH REAL-TIME
   5 DETIK
===================================================== */

setInterval(
  loadHealthData,
  5000
);


setInterval(
  loadEnvironmentData,
  5000
);