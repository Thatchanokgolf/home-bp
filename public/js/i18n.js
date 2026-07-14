// Simple i18n. Default = Thai. Toggle stored in localStorage ('hbp_lang').
const STRINGS = {
  th: {
    app_title: 'ระบบบันทึกความดันโลหิตที่บ้าน',
    lang_toggle: 'EN',
    // login
    login_title: 'เข้าสู่ระบบ',
    id_or_email: 'ไอดี หรือ อีเมล',
    password: 'รหัสผ่าน',
    login_btn: 'เข้าสู่ระบบ',
    forgot_pw: 'ลืมรหัสผ่าน?',
    go_register: 'ยังไม่มีบัญชี? ลงทะเบียน',
    forgot_prompt: 'กรอกอีเมลที่ลงทะเบียนไว้ ระบบจะส่งรหัสผ่านใหม่ให้',
    email: 'อีเมล',
    send: 'ส่ง',
    cancel: 'ยกเลิก',
    // register
    register_title: 'ลงทะเบียน',
    email_opt: 'อีเมล (ไม่บังคับ)',
    hospital_opt: 'โรงพยาบาล (ไม่บังคับ)',
    select_hospital: '-- เลือกโรงพยาบาล --',
    siriraj: 'โรงพยาบาลศิริราช',
    srinagarind: 'โรงพยาบาลศรีนครินทร์',
    hn_opt: 'เลขประจำตัวผู้ป่วย (HN) (ไม่บังคับ)',
    reenter_pw: 'กรอกรหัสผ่านอีกครั้ง',
    shared_q: 'แชร์ข้อมูลให้แพทย์?',
    yes: 'ใช่',
    no: 'ไม่',
    submit: 'บันทึก',
    reg_success: 'ลงทะเบียนสำเร็จ! นี่คือข้อมูลของคุณ',
    your_id: 'ไอดี',
    goto_login: 'ไปหน้าเข้าสู่ระบบ',
    // user / submit
    welcome: 'สวัสดี',
    logout: 'ออกจากระบบ',
    tab_submit: 'บันทึกความดัน',
    tab_review: 'ดูผลความดัน',
    submit_bp_title: 'บันทึกค่าความดันโลหิต',
    datetime: 'วันที่/เวลา',
    systolic: 'ความดันตัวบน (Systolic)',
    diastolic: 'ความดันตัวล่าง (Diastolic)',
    heart_rate: 'อัตราการเต้นหัวใจ',
    save_reading: 'บันทึกค่า',
    saved_ok: 'บันทึกเรียบร้อยแล้ว',
    // admin
    admin_title: 'หน้าผู้ดูแล (แพทย์)',
    search_ph: 'ค้นหาด้วย ไอดี หรือ HN',
    search: 'ค้นหา',
    no_results: 'ไม่พบข้อมูล (ค้นหาได้เฉพาะผู้ที่แชร์ข้อมูล)',
    col_id: 'ไอดี',
    col_email: 'อีเมล',
    col_hospital: 'โรงพยาบาล',
    col_hn: 'HN',
    review_record: 'ดูบันทึก',
    // review
    review_title: 'ผลการวัดความดันโลหิต',
    back: 'ย้อนกลับ',
    date_from: 'ตั้งแต่วันที่',
    date_to: 'ถึงวันที่',
    apply: 'แสดงผล',
    tab_all: 'ค่าความดันทั้งหมด',
    tab_avg: 'ค่าเฉลี่ยความดัน',
    tab_graph: 'กราฟแท่ง',
    col_date: 'วันที่',
    col_time: 'เวลา',
    col_ampm: 'ช่วง',
    col_sys: 'ตัวบน',
    col_dia: 'ตัวล่าง',
    col_hr: 'หัวใจ',
    no_data: 'ไม่มีข้อมูลในช่วงวันที่นี้',
    sum_am: 'ค่าเฉลี่ยช่วงเช้า (AM)',
    sum_pm: 'ค่าเฉลี่ยช่วงบ่าย (PM)',
    sum_24: 'ค่าเฉลี่ย 24 ชั่วโมง',
    sum_freq: 'ความถี่การวัด',
    times: 'ครั้ง',
    graph_sys: 'ตัวบน',
    graph_dia: 'ตัวล่าง',
    graph_hr: 'หัวใจ',
    err_generic: 'เกิดข้อผิดพลาด',
  },
  en: {
    app_title: 'Home Blood Pressure Log',
    lang_toggle: 'ไทย',
    login_title: 'Log in',
    id_or_email: 'ID or E-mail',
    password: 'Password',
    login_btn: 'Log in',
    forgot_pw: 'Forgot my password?',
    go_register: "No account? Register",
    forgot_prompt: 'Enter your registered e-mail. A new password will be sent to it.',
    email: 'E-mail',
    send: 'Send',
    cancel: 'Cancel',
    register_title: 'Registration',
    email_opt: 'E-mail (optional)',
    hospital_opt: 'Hospital (optional)',
    select_hospital: '-- Select hospital --',
    siriraj: 'Siriraj Hospital',
    srinagarind: 'Srinagarind Hospital',
    hn_opt: 'Hospital ID / HN (optional)',
    reenter_pw: 'Re-enter password',
    shared_q: 'Shared to doctor?',
    yes: 'Yes',
    no: 'No',
    submit: 'Submit',
    reg_success: 'Registration complete! Here are your details',
    your_id: 'ID',
    goto_login: 'Go to log in',
    welcome: 'Welcome',
    logout: 'Log out',
    tab_submit: 'Submit BP',
    tab_review: 'Review BP',
    submit_bp_title: 'Submit a blood pressure reading',
    datetime: 'Date/Time',
    systolic: 'Systolic BP',
    diastolic: 'Diastolic BP',
    heart_rate: 'Heart Rate',
    save_reading: 'Save reading',
    saved_ok: 'Saved successfully',
    admin_title: 'Admin Page (Doctor)',
    search_ph: 'Search by ID or HN',
    search: 'Search',
    no_results: 'No results (only users who shared their data are searchable)',
    col_id: 'ID',
    col_email: 'E-mail',
    col_hospital: 'Hospital',
    col_hn: 'HN',
    review_record: 'Review record',
    review_title: 'Blood Pressure Review',
    back: 'Back',
    date_from: 'Date from',
    date_to: 'Date to',
    apply: 'Apply',
    tab_all: 'All BP Readings',
    tab_avg: 'Average BP Readings',
    tab_graph: 'Bar Graph',
    col_date: 'Date',
    col_time: 'Time',
    col_ampm: 'AM/PM',
    col_sys: 'Sys',
    col_dia: 'Dia',
    col_hr: 'HR',
    no_data: 'No data in this date range',
    sum_am: 'Average BP (AM)',
    sum_pm: 'Average BP (PM)',
    sum_24: 'Average BP (24h)',
    sum_freq: 'Monitoring frequency',
    times: 'times',
    graph_sys: 'Systolic',
    graph_dia: 'Diastolic',
    graph_hr: 'Heart rate',
    err_generic: 'Something went wrong',
  },
};

function getLang() {
  return localStorage.getItem('hbp_lang') || 'th';
}
function t(key) {
  const lang = getLang();
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.th[key] || key;
}
function applyI18n() {
  document.documentElement.lang = getLang();
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
  });
  const tb = document.getElementById('langToggle');
  if (tb) tb.textContent = t('lang_toggle');
  if (typeof window.onLangChange === 'function') window.onLangChange();
}
function toggleLang() {
  localStorage.setItem('hbp_lang', getLang() === 'th' ? 'en' : 'th');
  applyI18n();
}
document.addEventListener('DOMContentLoaded', applyI18n);
