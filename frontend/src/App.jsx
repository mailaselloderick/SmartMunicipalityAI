import { useEffect, useRef, useState } from 'react';

import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Send,
  Sparkles,
  RefreshCw,
  BarChart3,
  Clock3,
  ShieldAlert,
  LockKeyhole,
  LogOut,
  Search,
  ArrowLeft
} from 'lucide-react';

import ComplaintEvidence, { LocationMap } from './ComplaintEvidence';
import MunicipalAssistant from './MunicipalAssistant';
import 'leaflet/dist/leaflet.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const EMPTY_SUMMARY = {
  total_complaints: 0,
  by_status: {},
  by_category: {},
  by_priority: {},
  priority_summary: {
    high_priority: 0,
    critical_priority: 0,
    urgent_complaints: 0
  },
  resolution_summary: {
    resolved: 0,
    unresolved: 0,
    resolution_rate: 0
  }
};

const STATUSES = [
  'submitted',
  'under_review',
  'assigned',
  'in_progress',
  'resolved',
  'rejected'
];

const CATEGORIES = [
  'Electricity',
  'Public Facilities',
  'Roads and Transport',
  'Waste Management',
  'Water and Sanitation'
];

const PRIORITIES = [
  'low',
  'medium',
  'high',
  'critical'
];

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under review',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  rejected: 'Rejected'
};

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.detail;

    throw new Error(
      typeof detail === 'string'
        ? detail
        : detail?.message || `Request failed (${response.status}).`
    );
  }

  return data;
}

function normaliseSummary(summaryData) {
  return {
    ...EMPTY_SUMMARY,
    ...summaryData,
    priority_summary: {
      ...EMPTY_SUMMARY.priority_summary,
      ...summaryData.priority_summary
    },
    resolution_summary: {
      ...EMPTY_SUMMARY.resolution_summary,
      ...summaryData.resolution_summary
    }
  };
}

export default function App() {
  const [view, setView] = useState('citizen');

  // =====================================================
  // CITIZEN PORTAL STATE
  // =====================================================

  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [form, setForm] = useState({
    title: '',
    description: '',
    reporter_name: '',
    reporter_contact: '',
    area: ''
  });

  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // ADMIN PORTAL STATE
  // =====================================================

  const [adminToken, setAdminToken] = useState('');
  const [admin, setAdmin] = useState(null);

  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  const [loginBusy, setLoginBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [adminMessageType, setAdminMessageType] = useState('info');

  const [adminComplaints, setAdminComplaints] = useState([]);
  const [adminSummary, setAdminSummary] = useState(EMPTY_SUMMARY);
  const [adminLoading, setAdminLoading] = useState(false);

  // =====================================================
  // ADMIN NEW COMPLAINT NOTIFICATIONS
  // =====================================================

  const [newComplaintNotifications, setNewComplaintNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastComplaintCheck, setLastComplaintCheck] = useState(null);

  const knownComplaintIdsRef = useRef(new Set());
  const hasInitialisedNotificationsRef = useRef(false);

  // =====================================================
  // NOTIFICATION DROPDOWN TOGGLE
  // =====================================================

  function toggleNotifications() {
    console.log('Notification bell clicked');

    setShowNotifications(previous => !previous);
  }

  function clearNotifications() {
    setNewComplaintNotifications([]);
  }

  function openNotificationComplaint(complaint) {
    setNewComplaintNotifications(previous =>
      previous.filter(item => item.id !== complaint.id)
    );

    setShowNotifications(false);

    openComplaint(complaint.id);
  }

  // =====================================================
  // ADMIN NOTIFICATION SOUND
  // =====================================================

  const [soundEnabled, setSoundEnabled] = useState(false);

  const notificationAudioRef = useRef(null);
  const soundEnabledRef = useRef(false);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  function playNotificationSound() {
    if (!soundEnabledRef.current) return;

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      let audioContext = notificationAudioRef.current;

      if (!audioContext) {
        audioContext = new AudioContextClass();
        notificationAudioRef.current = audioContext;
      }

      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';

      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime
      );

      gainNode.gain.setValueAtTime(
        0.15,
        audioContext.currentTime
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.5
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);

    } catch (error) {
      console.error(
        'Notification sound could not be played:',
        error
      );
    }
  }

  async function toggleNotificationSound() {
    if (soundEnabled) {
      soundEnabledRef.current = false;
      setSoundEnabled(false);

      setAdminMessage('Notification sound disabled.');
      setAdminMessageType('info');

      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error(
          'Your browser does not support notification sound.'
        );
      }

      let audioContext = notificationAudioRef.current;

      if (!audioContext) {
        audioContext = new AudioContextClass();
        notificationAudioRef.current = audioContext;
      }

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      soundEnabledRef.current = true;
      setSoundEnabled(true);

      setAdminMessage('Notification sound enabled.');
      setAdminMessageType('success');

    } catch (error) {
      setAdminMessage(
        error.message || 'Could not enable notification sound.'
      );

      setAdminMessageType('error');
    }
  }

  // =====================================================
  // AI ANALYTICS REPORT STATE
  // =====================================================

  const [aiReport, setAiReport] = useState(null);
  const [reportDays, setReportDays] = useState(30);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  // =====================================================
  // ADMIN COMPLAINT MANAGEMENT STATE
  // =====================================================

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintHistory, setComplaintHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editStatus, setEditStatus] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPriority, setEditPriority] = useState('');

  const [statusComment, setStatusComment] = useState('');
  const [categoryComment, setCategoryComment] = useState('');
  const [priorityComment, setPriorityComment] = useState('');

  const [actionBusy, setActionBusy] = useState(false);

  // =====================================================
  // CITIZEN DASHBOARD
  // =====================================================

  async function refresh() {
    setLoading(true);

    try {
      const [complaintsResponse, summaryResponse] = await Promise.all([
        fetch(`${API}/api/v1/complaints`),
        fetch(`${API}/api/v1/analytics/summary`)
      ]);

      const complaintsData = await readResponse(complaintsResponse);
      const summaryData = await readResponse(summaryResponse);

      setComplaints(complaintsData);
      setSummary(normaliseSummary(summaryData));

    } catch (error) {
      setMessage(
        'Could not connect to the API. Make sure the FastAPI backend is running.'
      );
      setMessageType('error');

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function update(field, value) {
    setForm(old => ({
      ...old,
      [field]: value
    }));
  }

  // =====================================================
  // SUBMIT CITIZEN COMPLAINT WITH PHOTO AND LOCATION
  // =====================================================

  async function submit(e) {
    e.preventDefault();

    setBusy(true);
    setMessage('');

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (photo) {
        formData.append('photo', photo);
      }

      if (location) {
        formData.append('latitude', String(location[0]));
        formData.append('longitude', String(location[1]));
      }

      const response = await fetch(`${API}/api/v1/complaints`, {
        method: 'POST',
        body: formData
      });

      const data = await readResponse(response);

      setMessage(
        `Report received! Reference: ${data.reference_number}. Suggested category: ${data.predicted_category}.`
      );

      setMessageType('success');

      setForm({
        title: '',
        description: '',
        reporter_name: '',
        reporter_contact: '',
        area: ''
      });

      setPhoto(null);
      setLocation(null);

      await refresh();

    } catch (error) {
      setMessage(error.message);
      setMessageType('error');

    } finally {
      setBusy(false);
    }
  }

  // =====================================================
  // ADMIN LOGIN
  // =====================================================

  async function adminLogin(e) {
    e.preventDefault();

    setLoginBusy(true);
    setAdminMessage('');

    try {
      const loginResponse = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });

      const loginData = await readResponse(loginResponse);
      const token = loginData.access_token;

      if (!token) {
        throw new Error('The server did not return an access token.');
      }

      const profileResponse = await fetch(`${API}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const profileData = await readResponse(profileResponse);

      setAdminToken(token);
      setAdmin(profileData);

      setLoginForm({
        username: '',
        password: ''
      });

      setAdminMessage('Welcome to the Municipal Admin Portal.');
      setAdminMessageType('success');

      await loadAdminDashboard(token);

    } catch (error) {
      setAdminMessage(error.message);
      setAdminMessageType('error');

      setAdminToken('');
      setAdmin(null);

    } finally {
      setLoginBusy(false);
    }
  }

  // =====================================================
  // LOAD AI ANALYTICS REPORT
  // =====================================================

  async function loadAIReport(token = adminToken, days = reportDays) {
    if (!token) return;

    setReportLoading(true);
    setReportError('');

    try {
      const response = await fetch(
        `${API}/api/v1/analytics/ai-report?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          }
        }
      );

      const data = await readResponse(response);

      if (!data.success || !data.report) {
        throw new Error('The AI report could not be generated.');
      }

      setAiReport({
        ...data.report,
        generated_by: data.generated_by
      });

    } catch (error) {
      setReportError(error.message);
      setAiReport(null);

    } finally {
      setReportLoading(false);
    }
  }

  // =====================================================
  // ADMIN DASHBOARD DATA
  // =====================================================

  async function loadAdminDashboard(token = adminToken) {
    if (!token) return;

    setAdminLoading(true);

    try {
      const [complaintsResponse, summaryResponse] = await Promise.all([
        fetch(`${API}/api/v1/complaints?limit=500`),
        fetch(`${API}/api/v1/analytics/summary`)
      ]);

      const complaintsData = await readResponse(complaintsResponse);
      const summaryData = await readResponse(summaryResponse);

      if (!hasInitialisedNotificationsRef.current) {
        knownComplaintIdsRef.current = new Set(
          complaintsData.map(complaint => complaint.id)
        );

        hasInitialisedNotificationsRef.current = true;
      } else {
        const newComplaints = complaintsData.filter(
          complaint => !knownComplaintIdsRef.current.has(complaint.id)
        );

        if (newComplaints.length > 0) {
          newComplaints.forEach(complaint => {
            knownComplaintIdsRef.current.add(complaint.id);
          });

          setNewComplaintNotifications(previous => [
            ...newComplaints,
            ...previous
          ]);

          playNotificationSound();
        }
      }

      setAdminComplaints(complaintsData);
      setAdminSummary(normaliseSummary(summaryData));

      await loadAIReport(token);

    } catch (error) {
      setAdminMessage(error.message);
      setAdminMessageType('error');

    } finally {
      setAdminLoading(false);
    }
  }

  // =====================================================
  // CHECK FOR NEW COMPLAINTS EVERY 15 SECONDS
  // =====================================================

  useEffect(() => {
    if (!adminToken) return undefined;

    const checkForNewComplaints = async () => {
      try {
        const response = await fetch(`${API}/api/v1/complaints?limit=500`);
        const complaintsData = await readResponse(response);

        if (!hasInitialisedNotificationsRef.current) {
          knownComplaintIdsRef.current = new Set(
            complaintsData.map(complaint => complaint.id)
          );

          hasInitialisedNotificationsRef.current = true;
        } else {
          const newComplaints = complaintsData.filter(
            complaint => !knownComplaintIdsRef.current.has(complaint.id)
          );

          if (newComplaints.length > 0) {
            newComplaints.forEach(complaint => {
              knownComplaintIdsRef.current.add(complaint.id);
            });

            setNewComplaintNotifications(previous => [
              ...newComplaints,
              ...previous
            ]);

            playNotificationSound();
          }
        }

        setAdminComplaints(complaintsData);
        setLastComplaintCheck(new Date());

      } catch {
        // Keep the dashboard running if a background check temporarily fails.
      }
    };

    const intervalId = setInterval(checkForNewComplaints, 15000);

    return () => clearInterval(intervalId);
  }, [adminToken]);

  // =====================================================
  // LOAD COMPLAINT DETAILS AND HISTORY
  // =====================================================

  async function openComplaint(complaintId) {
    setDetailLoading(true);
    setSelectedComplaint(null);
    setComplaintHistory([]);

    try {
      const [complaintResponse, historyResponse] = await Promise.all([
        fetch(`${API}/api/v1/complaints/${complaintId}`),
        fetch(`${API}/api/v1/complaints/${complaintId}/history`)
      ]);

      const complaintData = await readResponse(complaintResponse);
      const historyData = await readResponse(historyResponse);

      setSelectedComplaint(complaintData);
      setComplaintHistory(historyData.history || []);

      setEditStatus(complaintData.status);
      setEditCategory(complaintData.predicted_category || CATEGORIES[0]);
      setEditPriority(complaintData.priority);

      setStatusComment('');
      setCategoryComment('');
      setPriorityComment('');

    } catch (error) {
      setAdminMessage(error.message);
      setAdminMessageType('error');

    } finally {
      setDetailLoading(false);
    }
  }

  // =====================================================
  // ADMIN API REQUEST
  // =====================================================

  async function adminPatch(endpoint, payload) {
    if (!adminToken) {
      throw new Error('Please log in again.');
    }

    const response = await fetch(`${API}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });

    return readResponse(response);
  }

  // =====================================================
  // UPDATE COMPLAINT STATUS
  // =====================================================

  async function saveStatus() {
    if (!selectedComplaint) return;

    setActionBusy(true);
    setAdminMessage('');

    try {
      await adminPatch(
        `/api/v1/complaints/${selectedComplaint.id}/status`,
        {
          status: editStatus,
          comment: statusComment
        }
      );

      setAdminMessage('Complaint status updated successfully.');
      setAdminMessageType('success');

      await openComplaint(selectedComplaint.id);
      await loadAdminDashboard();

    } catch (error) {
      setAdminMessage(error.message);
      setAdminMessageType('error');

    } finally {
      setActionBusy(false);
    }
  }

  // =====================================================
  // UPDATE COMPLAINT CATEGORY
  // =====================================================

  async function saveCategory() {
    if (!selectedComplaint) return;

    setActionBusy(true);
    setAdminMessage('');

    try {
      await adminPatch(
        `/api/v1/complaints/${selectedComplaint.id}/category`,
        {
          category: editCategory,
          comment: categoryComment
        }
      );

      setAdminMessage('Complaint category corrected successfully.');
      setAdminMessageType('success');

      await openComplaint(selectedComplaint.id);
      await loadAdminDashboard();

    } catch (error) {
      setAdminMessage(error.message);
      setAdminMessageType('error');

    } finally {
      setActionBusy(false);
    }
  }

  // =====================================================
  // UPDATE COMPLAINT PRIORITY
  // =====================================================

  async function savePriority() {
    if (!selectedComplaint) return;

    setActionBusy(true);
    setAdminMessage('');

    try {
      await adminPatch(
        `/api/v1/complaints/${selectedComplaint.id}/priority`,
        {
          priority: editPriority,
          comment: priorityComment
        }
      );

      setAdminMessage('Complaint priority updated successfully.');
      setAdminMessageType('success');

      await openComplaint(selectedComplaint.id);
      await loadAdminDashboard();

    } catch (error) {
      setAdminMessage(error.message);
      setAdminMessageType('error');

    } finally {
      setActionBusy(false);
    }
  }

  // =====================================================
  // ADMIN LOGOUT
  // =====================================================

  function adminLogout() {
    setAdminToken('');
    setAdmin(null);
    setAdminComplaints([]);
    setAdminSummary(EMPTY_SUMMARY);

    knownComplaintIdsRef.current = new Set();
    hasInitialisedNotificationsRef.current = false;

    setNewComplaintNotifications([]);
    setShowNotifications(false);
    setLastComplaintCheck(null);

    setAiReport(null);
    setReportError('');

    setSelectedComplaint(null);
    setComplaintHistory([]);

    setSearchTerm('');
    setStatusFilter('all');

    setAdminMessage('You have been logged out.');
    setAdminMessageType('success');

    setView('citizen');
  }

  // =====================================================
  // ADMIN FILTERING
  // =====================================================

  const filteredComplaints = adminComplaints.filter(complaint => {
    const matchesSearch = [
      complaint.title,
      complaint.reference_number,
      complaint.area,
      complaint.reporter_name,
      complaint.predicted_category
    ]
      .filter(Boolean)
      .some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      statusFilter === 'all' ||
      complaint.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // =====================================================
  // CITIZEN ANALYTICS
  // =====================================================

  const total = summary.total_complaints || 0;
  const statuses = summary.by_status || {};
  const categories = summary.by_category || {};
  const priorities = summary.by_priority || {};

  const activeComplaints =
    (statuses.submitted || 0) +
    (statuses.under_review || 0) +
    (statuses.assigned || 0) +
    (statuses.in_progress || 0);

  const resolved = summary.resolution_summary.resolved || 0;
  const unresolved = summary.resolution_summary.unresolved || 0;

  const urgent =
    summary.priority_summary.urgent_complaints ??
    ((priorities.high || 0) + (priorities.critical || 0));

  const resolutionRate =
    summary.resolution_summary.resolution_rate || 0;

  const categoryColors = [
    '#315fbb',
    '#179b80',
    '#d58a37',
    '#9b70ca',
    '#d45d67'
  ];

  // =====================================================
  // ADMIN PORTAL VIEW
  // =====================================================

  if (view === 'admin') {
    return (
      <main className="adminShell">

        <style>{`
          .adminShell {
            min-height: 100vh;
            background: #f4f6fa;
            color: #1c2940;
            padding: 28px;
            font-family: inherit;
          }

          .adminContainer {
            max-width: 1450px;
            margin: auto;
          }

          .adminTopbar {
            position: relative;
            z-index: 200;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
          }

          .adminBrand {
            display: flex;
            align-items: center;
            gap: 13px;
          }

          .adminBrandIcon {
            width: 48px;
            height: 48px;
            display: grid;
            place-items: center;
            background: #173b73;
            color: white;
            border-radius: 13px;
            font-weight: 800;
          }

          .adminBrand strong {
            display: block;
            font-size: 19px;
          }

          .adminBrand small {
            display: block;
            color: #7b8799;
            margin-top: 4px;
          }

          .adminButton {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 11px 15px;
            border: 1px solid #dce2ec;
            border-radius: 9px;
            background: white;
            color: #243a5b;
            cursor: pointer;
            font-weight: 600;
          }

          .adminButton:disabled {
            opacity: .55;
            cursor: not-allowed;
          }

          .adminPrimary {
            background: #173b73;
            color: white;
            border-color: #173b73;
          }

          .adminDanger {
            color: #b42332;
          }

          .adminHero {
            background: #173b73;
            color: white;
            padding: 30px;
            border-radius: 16px;
            margin-bottom: 24px;
          }

          .adminHero p {
            color: #d6e2f6;
            margin: 8px 0 0;
          }

          .adminHero h1 {
            font-size: clamp(25px, 4vw, 36px);
            margin: 0;
          }

          .adminStats {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }

          .adminStat {
            background: white;
            border: 1px solid #e7ebf2;
            padding: 20px;
            border-radius: 13px;
          }

          .adminStat span {
            display: block;
            color: #758198;
            font-size: 13px;
            margin-bottom: 10px;
          }

          .adminStat strong {
            font-size: 29px;
          }

          .adminPanel {
            background: white;
            border: 1px solid #e7ebf2;
            border-radius: 14px;
            padding: 22px;
            margin-bottom: 20px;
            min-width: 0;
          }

          .adminPanel h2 {
            margin: 0 0 8px;
            font-size: 20px;
          }

          .adminMuted {
            color: #778397;
            font-size: 13px;
          }

          .adminFilters {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin: 20px 0;
          }

          .adminInput,
          .adminSelect,
          .adminTextarea {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #dce2ec;
            border-radius: 8px;
            padding: 11px 12px;
            background: white;
            color: #243047;
            font: inherit;
          }

          .adminSearch {
            flex: 1;
            min-width: 220px;
            position: relative;
          }

          .adminSearch input {
            padding-left: 38px;
          }

          .adminSearch svg {
            position: absolute;
            left: 12px;
            top: 13px;
            color: #8793a5;
          }

          .adminTableWrap {
            width: 100%;
            overflow-x: auto;
          }

          .adminTable {
            width: 100%;
            border-collapse: collapse;
            min-width: 780px;
          }

          .adminTable th,
          .adminTable td {
            text-align: left;
            padding: 14px 12px;
            border-bottom: 1px solid #edf0f5;
            font-size: 13px;
          }

          .adminTable th {
            color: #78849a;
            font-weight: 700;
            background: #fafbfd;
          }

          .adminTable td strong {
            display: block;
            margin-bottom: 4px;
          }

          .adminBadge {
            display: inline-block;
            border-radius: 20px;
            padding: 5px 9px;
            font-size: 11px;
            font-weight: 700;
            background: #edf1f7;
            color: #41516b;
            text-transform: capitalize;
          }

          .adminBadge.high,
          .adminBadge.critical {
            background: #fff0ed;
            color: #bd3c2f;
          }

          .adminBadge.resolved {
            background: #e8f7ee;
            color: #24784a;
          }

          .adminBadge.in_progress,
          .adminBadge.under_review,
          .adminBadge.assigned {
            background: #edf3ff;
            color: #315fbb;
          }

          .adminRowButton {
            border: 0;
            background: transparent;
            color: #2457a3;
            font-weight: 700;
            cursor: pointer;
          }

          .adminMessage {
            padding: 12px 15px;
            border-radius: 9px;
            margin-bottom: 18px;
            font-size: 14px;
          }

          .adminMessage.success {
            background: #e8f7ee;
            color: #24784a;
          }

          .adminMessage.error {
            background: #fff0ed;
            color: #b42332;
          }

          .adminMessage.info {
            background: #edf3ff;
            color: #315fbb;
          }

          .adminLoginWrap {
            max-width: 460px;
            margin: 65px auto;
          }

          .adminLoginCard {
            background: white;
            border: 1px solid #e7ebf2;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 15px 45px rgba(22, 42, 74, .07);
          }

          .adminLoginCard h1 {
            margin: 12px 0 8px;
          }

          .adminField {
            display: block;
            margin: 17px 0;
            font-size: 13px;
            font-weight: 700;
          }

          .adminField input,
          .adminField select,
          .adminField textarea {
            margin-top: 8px;
          }

          .adminDetailGrid {
            display: grid;
            grid-template-columns: 1.2fr .8fr;
            gap: 20px;
          }

          .adminDetailInfo {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            margin-top: 18px;
          }

          .adminInfoCell {
            background: #f7f9fc;
            border-radius: 9px;
            padding: 13px;
            min-width: 0;
          }

          .adminInfoCell small {
            display: block;
            color: #7b8799;
            margin-bottom: 6px;
          }

          .adminInfoCell strong {
            overflow-wrap: anywhere;
          }

          .adminDescription {
            line-height: 1.7;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
          }

          .adminEditSection {
            border-top: 1px solid #edf0f5;
            margin-top: 20px;
            padding-top: 18px;
          }

          .adminEditSection h3 {
            margin: 0 0 12px;
            font-size: 16px;
          }

          .adminHistory {
            margin-top: 12px;
            border-left: 2px solid #dce5f3;
            padding-left: 18px;
          }

          .adminHistoryItem {
            position: relative;
            padding: 0 0 20px;
          }

          .adminHistoryItem:before {
            content: '';
            position: absolute;
            left: -24px;
            top: 4px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #315fbb;
          }

          .adminHistoryItem p {
            margin: 7px 0;
            line-height: 1.5;
          }

          .adminHistoryItem small {
            color: #78849a;
          }

          .adminEmpty {
            text-align: center;
            padding: 35px 15px;
            color: #78849a;
          }

          .adminFooter {
            text-align: center;
            color: #8590a1;
            font-size: 12px;
            padding: 20px 0;
          }

          .adminReportHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            flex-wrap: wrap;
            margin-bottom: 20px;
          }

          .adminReportControls {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }

          .adminReportControls select {
            width: auto;
            min-width: 130px;
          }

          .adminReportSummary {
            background: #f1f5fb;
            border-left: 4px solid #315fbb;
            border-radius: 9px;
            padding: 17px;
            line-height: 1.7;
            margin-bottom: 20px;
          }

          .adminReportGrid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 20px;
          }

          .adminReportCard {
            background: #fff;
            border: 1px solid #e7ebf2;
            border-radius: 11px;
            padding: 17px;
            min-width: 0;
          }

          .adminReportCard h3 {
            margin: 0 0 16px;
            font-size: 15px;
          }

          .adminReportMetric {
            font-size: 30px;
            font-weight: 800;
            color: #173b73;
          }

          .adminReportBarItem {
            margin: 14px 0;
          }

          .adminReportBarLabel {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            font-size: 13px;
            margin-bottom: 7px;
          }

          .adminReportTrack {
            width: 100%;
            height: 9px;
            border-radius: 20px;
            background: #edf0f5;
            overflow: hidden;
          }

          .adminReportFill {
            height: 100%;
            border-radius: 20px;
            background: #315fbb;
            transition: width .3s ease;
          }

          .adminReportList {
            padding-left: 20px;
            margin: 0;
          }

          .adminReportList li {
            margin-bottom: 11px;
            line-height: 1.6;
            font-size: 13px;
          }

          .adminReportPill {
            display: inline-block;
            background: #edf3ff;
            color: #315fbb;
            border-radius: 20px;
            padding: 5px 10px;
            font-size: 12px;
            font-weight: 700;
            margin: 3px;
          }

          .adminReportError {
            padding: 13px;
            background: #fff0ed;
            color: #b42332;
            border-radius: 9px;
            margin: 15px 0;
            font-size: 13px;
          }

          .adminReportMeta {
            color: #78849a;
            font-size: 12px;
            margin-top: 12px;
          }

          /* NOTIFICATION DROPDOWN FIX */

          .adminNotificationWrap {
            position: relative;
            z-index: 1000;
          }

          .adminNotificationButton {
            position: relative;
            z-index: 1001;
            min-width: 44px;
            padding: 11px 13px;
            cursor: pointer;
            pointer-events: auto;
          }

          .adminNotificationButton svg {
            pointer-events: none;
          }

          .adminNotificationCount {
            position: absolute;
            top: -7px;
            right: -7px;
            min-width: 19px;
            height: 19px;
            padding: 0 5px;
            display: grid;
            place-items: center;
            border-radius: 20px;
            background: #d92d20;
            color: #fff;
            border: 2px solid #fff;
            font-size: 10px;
            font-weight: 800;
            line-height: 1;
            pointer-events: none;
          }

          .adminNotificationPanel {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            width: 350px;
            max-width: min(90vw, 350px);
            max-height: 420px;
            overflow-y: auto;
            z-index: 2000;
            display: block;
            background: #fff;
            border: 1px solid #e2e7ef;
            border-radius: 12px;
            box-shadow: 0 16px 40px rgba(20, 35, 60, .18);
            pointer-events: auto;
          }

          .adminNotificationHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 15px;
            border-bottom: 1px solid #edf0f5;
          }

          .adminNotificationHeader strong {
            font-size: 14px;
          }

          .adminNotificationClear {
            border: 0;
            background: transparent;
            color: #2457a3;
            cursor: pointer;
            font-size: 12px;
            font-weight: 700;
          }

          .adminNotificationItem {
            display: block;
            width: 100%;
            padding: 14px 15px;
            border: 0;
            border-bottom: 1px solid #edf0f5;
            background: #fff;
            color: #243047;
            text-align: left;
            cursor: pointer;
          }

          .adminNotificationItem:hover {
            background: #f5f8fc;
          }

          .adminNotificationItem strong {
            display: block;
            margin-bottom: 5px;
            font-size: 13px;
          }

          .adminNotificationItem small {
            display: block;
            color: #78849a;
            font-size: 11px;
            margin-top: 5px;
          }

          .adminNotificationEmpty {
            padding: 25px 15px;
            text-align: center;
            color: #78849a;
            font-size: 13px;
          }

          @media (max-width: 850px) {
            .adminStats {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .adminDetailGrid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 650px) {
            .adminReportGrid {
              grid-template-columns: 1fr;
            }

            .adminReportControls {
              width: 100%;
            }

            .adminReportControls select,
            .adminReportControls button {
              flex: 1;
            }
          }

          @media (max-width: 520px) {
            .adminShell {
              padding: 15px;
            }

            .adminStats {
              grid-template-columns: 1fr 1fr;
              gap: 9px;
            }

            .adminStat {
              padding: 14px;
            }

            .adminStat strong {
              font-size: 23px;
            }

            .adminPanel {
              padding: 15px;
            }

            .adminDetailInfo {
              grid-template-columns: 1fr;
            }

            .adminHero {
              padding: 22px;
            }
          }
        `}</style>

        <div className="adminContainer">

          {/* ADMIN HEADER */}

          <header className="adminTopbar">
            <div className="adminBrand">
              <div className="adminBrandIcon">SA</div>

              <div>
                <strong>SmartMunicipality AI</strong>
                <small>Municipal Administration Portal</small>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                alignItems: 'center'
              }}
            >

              {admin && (
                <button
                  type="button"
                  className="adminButton"
                  onClick={toggleNotificationSound}
                  aria-pressed={soundEnabled}
                  title={
                    soundEnabled
                      ? 'Disable notification sound'
                      : 'Enable notification sound'
                  }
                >
                  <Bell size={17} />
                  {soundEnabled ? 'Sound On' : 'Enable Sound'}
                </button>
              )}

              {admin && (
                <div className="adminNotificationWrap">
                  <button
                    type="button"
                    className="adminButton adminNotificationButton"
                    onClick={toggleNotifications}
                    aria-label={`Notifications: ${newComplaintNotifications.length} new complaints`}
                    aria-expanded={showNotifications}
                    aria-haspopup="true"
                  >
                    <Bell size={17} />

                    {newComplaintNotifications.length > 0 && (
                      <span className="adminNotificationCount">
                        {newComplaintNotifications.length > 99
                          ? '99+'
                          : newComplaintNotifications.length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="adminNotificationPanel">
                      <div className="adminNotificationHeader">
                        <strong>New complaints</strong>

                        {newComplaintNotifications.length > 0 && (
                          <button
                            type="button"
                            className="adminNotificationClear"
                            onClick={clearNotifications}
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      {newComplaintNotifications.length === 0 ? (
                        <div className="adminNotificationEmpty">
                          No new complaints.

                          <small
                            style={{
                              display: 'block',
                              marginTop: 7
                            }}
                          >
                            {lastComplaintCheck
                              ? `Last checked: ${lastComplaintCheck.toLocaleTimeString()}`
                              : 'Waiting for updates...'}
                          </small>
                        </div>
                      ) : (
                        newComplaintNotifications.map(complaint => (
                          <button
                            type="button"
                            className="adminNotificationItem"
                            key={complaint.id}
                            onClick={() =>
                              openNotificationComplaint(complaint)
                            }
                          >
                            <strong>
                              {complaint.reference_number ||
                                `Complaint #${complaint.id}`}
                            </strong>

                            <span>
                              {complaint.title || 'New complaint submitted'}
                            </span>

                            <small>
                              {complaint.created_at
                                ? new Date(
                                    complaint.created_at
                                  ).toLocaleString()
                                : 'Submission time unavailable'}
                            </small>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                className="adminButton"
                onClick={() => setView('citizen')}
              >
                <ArrowLeft size={16} />
                Citizen portal
              </button>

              {admin && (
                <button
                  type="button"
                  className="adminButton adminDanger"
                  onClick={adminLogout}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              )}
            </div>
          </header>

          {/* ADMIN LOGIN */}

          {!adminToken || !admin ? (
            <div className="adminLoginWrap">
              <form
                className="adminLoginCard"
                onSubmit={adminLogin}
              >
                <LockKeyhole size={34} color="#173b73" />

                <p className="adminMuted">
                  SECURE ADMINISTRATOR ACCESS
                </p>

                <h1>Administrator login</h1>

                <p className="adminMuted">
                  Sign in to manage community complaints and municipal
                  service delivery reports.
                </p>

                <label className="adminField">
                  Username

                  <input
                    className="adminInput"
                    type="text"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={80}
                    value={loginForm.username}
                    onChange={e =>
                      setLoginForm(old => ({
                        ...old,
                        username: e.target.value
                      }))
                    }
                    placeholder="Administrator username"
                  />
                </label>

                <label className="adminField">
                  Password

                  <input
                    className="adminInput"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={loginForm.password}
                    onChange={e =>
                      setLoginForm(old => ({
                        ...old,
                        password: e.target.value
                      }))
                    }
                    placeholder="Enter your password"
                  />
                </label>

                <button
                  className="adminButton adminPrimary"
                  type="submit"
                  disabled={loginBusy}
                  style={{ width: '100%', marginTop: 10 }}
                >
                  <LockKeyhole size={16} />
                  {loginBusy ? 'Signing in...' : 'Sign in securely'}
                </button>

                {adminMessage && (
                  <div
                    className={`adminMessage ${adminMessageType}`}
                    style={{ marginTop: 18 }}
                  >
                    {adminMessage}
                  </div>
                )}

                <p className="adminMuted" style={{ marginTop: 22 }}>
                  Protected administrative access. Only authorised
                  municipal administrators can modify complaints.
                </p>
              </form>
            </div>
          ) : (
            <>
              {/* ADMIN DASHBOARD */}

              <section className="adminHero">
                <p>ADMINISTRATOR WORKSPACE</p>

                <h1>Municipal service delivery management</h1>

                <p>
                  Welcome, {admin.full_name}. Review, classify and
                  manage community complaints.
                </p>
              </section>

              {adminMessage && (
                <div className={`adminMessage ${adminMessageType}`}>
                  {adminMessage}
                </div>
              )}

              {/* ADMIN STATISTICS */}

              <section className="adminStats">
                <article className="adminStat">
                  <span>Total complaints</span>
                  <strong>{adminSummary.total_complaints || 0}</strong>
                </article>

                <article className="adminStat">
                  <span>Active complaints</span>
                  <strong>
                    {(adminSummary.by_status?.submitted || 0) +
                      (adminSummary.by_status?.under_review || 0) +
                      (adminSummary.by_status?.assigned || 0) +
                      (adminSummary.by_status?.in_progress || 0)}
                  </strong>
                </article>

                <article className="adminStat">
                  <span>Resolved complaints</span>
                  <strong>
                    {adminSummary.resolution_summary?.resolved || 0}
                  </strong>
                </article>

                <article className="adminStat">
                  <span>High / critical priority</span>
                  <strong>
                    {adminSummary.priority_summary?.urgent_complaints || 0}
                  </strong>
                </article>
              </section>

              {/* AI ANALYTICS REPORT */}

              <section className="adminPanel">

                <div className="adminReportHeader">
                  <div>
                    <h2>
                      <Sparkles
                        size={20}
                        style={{
                          display: 'inline',
                          verticalAlign: 'middle',
                          marginRight: 7
                        }}
                      />
                      AI Analytics Report
                    </h2>

                    <p className="adminMuted">
                      AI-generated insights into municipal service delivery
                      and complaint trends.
                    </p>
                  </div>

                  <div className="adminReportControls">
                    <select
                      className="adminSelect"
                      value={reportDays}
                      onChange={e => setReportDays(Number(e.target.value))}
                      aria-label="Reporting period"
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={60}>Last 60 days</option>
                      <option value={90}>Last 90 days</option>
                      <option value={180}>Last 180 days</option>
                      <option value={365}>Last 365 days</option>
                    </select>

                    <button
                      className="adminButton adminPrimary"
                      disabled={reportLoading}
                      onClick={() => loadAIReport(adminToken, reportDays)}
                    >
                      <RefreshCw size={15} />
                      {reportLoading ? 'Generating...' : 'Generate report'}
                    </button>
                  </div>
                </div>

                {reportError && (
                  <div className="adminReportError">
                    <AlertTriangle
                      size={16}
                      style={{
                        verticalAlign: 'middle',
                        marginRight: 6
                      }}
                    />
                    {reportError}
                  </div>
                )}

                {reportLoading && !aiReport ? (
                  <div className="adminEmpty">
                    <RefreshCw size={25} />
                    <p>Generating AI analytics report...</p>
                  </div>
                ) : aiReport ? (
                  <>
                    <div className="adminReportSummary">
                      <strong>AI-generated executive summary</strong>

                      <p style={{ margin: '9px 0 0' }}>
                        {aiReport.summary}
                      </p>

                      <div className="adminReportMeta">
                        Reporting period: Last {aiReport.period_days} days
                        {' · '}
                        Generated:{' '}
                        {aiReport.generated_at
                          ? new Date(aiReport.generated_at).toLocaleString()
                          : 'Not available'}
                      </div>
                    </div>

                    <div className="adminReportGrid">
                      <article className="adminReportCard">
                        <h3>Total complaints in reporting period</h3>

                        <div className="adminReportMetric">
                          {aiReport.total_complaints ?? 0}
                        </div>
                      </article>

                      <article className="adminReportCard">
                        <h3>Resolution performance</h3>

                        <div className="adminReportMetric">
                          {aiReport.resolution_performance?.resolution_rate ?? 0}%
                        </div>

                        <p className="adminMuted">
                          {aiReport.resolution_performance?.resolved ?? 0} resolved
                          {' · '}
                          {aiReport.resolution_performance?.unresolved ?? 0} unresolved
                        </p>

                        <div className="adminReportTrack">
                          <div
                            className="adminReportFill"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  Number(
                                    aiReport.resolution_performance?.resolution_rate || 0
                                  )
                                )
                              )}%`,
                              background: '#179b80'
                            }}
                          />
                        </div>
                      </article>
                    </div>

                    <div className="adminReportGrid">
                      <article className="adminReportCard">
                        <h3>Complaints by category</h3>

                        {(aiReport.category_analysis || []).length === 0 ? (
                          <p className="adminMuted">
                            No category data available.
                          </p>
                        ) : (
                          aiReport.category_analysis.map((item, index) => (
                            <div
                              className="adminReportBarItem"
                              key={`${item.category}-${index}`}
                            >
                              <div className="adminReportBarLabel">
                                <span>{item.category}</span>

                                <strong>
                                  {item.count} ({item.percentage}%)
                                </strong>
                              </div>

                              <div className="adminReportTrack">
                                <div
                                  className="adminReportFill"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(0, Number(item.percentage || 0))
                                    )}%`
                                  }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </article>

                      <article className="adminReportCard">
                        <h3>Complaints by area</h3>

                        {(aiReport.area_analysis || []).length === 0 ? (
                          <p className="adminMuted">
                            No area data available.
                          </p>
                        ) : (
                          aiReport.area_analysis.map((item, index) => (
                            <div
                              className="adminReportBarItem"
                              key={`${item.area}-${index}`}
                            >
                              <div className="adminReportBarLabel">
                                <span>{item.area || 'Unknown area'}</span>
                                <strong>{item.complaint_count}</strong>
                              </div>

                              <div className="adminReportTrack">
                                <div
                                  className="adminReportFill"
                                  style={{
                                    width: `${
                                      aiReport.total_complaints
                                        ? Math.min(
                                            100,
                                            (item.complaint_count /
                                              aiReport.total_complaints) * 100
                                          )
                                        : 0
                                    }%`,
                                    background: '#179b80'
                                  }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </article>
                    </div>

                    <div className="adminReportGrid">
                      <article className="adminReportCard">
                        <h3>Priority analysis</h3>

                        {Object.entries(
                          aiReport.priority_analysis || {}
                        ).length === 0 ? (
                          <p className="adminMuted">
                            No priority data available.
                          </p>
                        ) : (
                          Object.entries(
                            aiReport.priority_analysis || {}
                          ).map(([name, value]) => (
                            <div
                              className="adminReportBarItem"
                              key={name}
                            >
                              <div className="adminReportBarLabel">
                                <span style={{ textTransform: 'capitalize' }}>
                                  {name}
                                </span>

                                <strong>{value}</strong>
                              </div>

                              <div className="adminReportTrack">
                                <div
                                  className="adminReportFill"
                                  style={{
                                    width: `${
                                      aiReport.total_complaints
                                        ? Math.min(
                                            100,
                                            (value / aiReport.total_complaints) * 100
                                          )
                                        : 0
                                    }%`,
                                    background:
                                      name === 'critical'
                                        ? '#bd3c2f'
                                        : '#d58a37'
                                  }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </article>

                      <article className="adminReportCard">
                        <h3>Status analysis</h3>

                        {Object.entries(
                          aiReport.status_analysis || {}
                        ).length === 0 ? (
                          <p className="adminMuted">
                            No status data available.
                          </p>
                        ) : (
                          Object.entries(
                            aiReport.status_analysis || {}
                          ).map(([name, value]) => (
                            <div
                              className="adminReportBarItem"
                              key={name}
                            >
                              <div className="adminReportBarLabel">
                                <span>
                                  {STATUS_LABELS[name] ||
                                    name.replaceAll('_', ' ')}
                                </span>

                                <strong>{value}</strong>
                              </div>

                              <div className="adminReportTrack">
                                <div
                                  className="adminReportFill"
                                  style={{
                                    width: `${
                                      aiReport.total_complaints
                                        ? Math.min(
                                            100,
                                            (value / aiReport.total_complaints) * 100
                                          )
                                        : 0
                                    }%`,
                                    background: '#9b70ca'
                                  }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </article>
                    </div>

                    <article
                      className="adminReportCard"
                      style={{ marginBottom: 20 }}
                    >
                      <h3>
                        <AlertTriangle
                          size={17}
                          style={{
                            display: 'inline',
                            verticalAlign: 'middle',
                            marginRight: 6
                          }}
                        />
                        Recurring problems
                      </h3>

                      {(aiReport.recurring_problems || []).length === 0 ? (
                        <p className="adminMuted">
                          No recurring problems identified.
                        </p>
                      ) : (
                        aiReport.recurring_problems.map((item, index) => (
                          <div
                            key={`${item.category}-${index}`}
                            style={{ marginBottom: 14 }}
                          >
                            <span className="adminReportPill">
                              {item.complaint_count} complaints
                            </span>

                            <strong>{item.category}</strong>

                            <p
                              className="adminMuted"
                              style={{ lineHeight: 1.6 }}
                            >
                              {item.message}
                            </p>
                          </div>
                        ))
                      )}
                    </article>

                    <article className="adminReportCard">
                      <h3>
                        <Sparkles
                          size={17}
                          style={{
                            display: 'inline',
                            verticalAlign: 'middle',
                            marginRight: 6
                          }}
                        />
                        AI recommendations
                      </h3>

                      {(aiReport.recommendations || []).length === 0 ? (
                        <p className="adminMuted">
                          No recommendations available.
                        </p>
                      ) : (
                        <ol className="adminReportList">
                          {aiReport.recommendations.map(
                            (recommendation, index) => (
                              <li key={index}>{recommendation}</li>
                            )
                          )}
                        </ol>
                      )}

                      <p className="adminReportMeta">
                        Generated by {aiReport.generated_by || 'SmartMunicipality AI'}
                        {' · '}
                        AI recommendations require review by authorised
                        municipal personnel.
                      </p>
                    </article>
                  </>
                ) : (
                  <div className="adminEmpty">
                    <BarChart3 size={28} />

                    <p>
                      No AI report loaded yet. Select a reporting period
                      and generate a report.
                    </p>
                  </div>
                )}
              </section>

              {/* COMPLAINT DETAIL VIEW */}

              {selectedComplaint ? (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <button
                      className="adminButton"
                      onClick={() => {
                        setSelectedComplaint(null);
                        setComplaintHistory([]);
                        setAdminMessage('');
                      }}
                    >
                      <ArrowLeft size={16} />
                      Back to complaints
                    </button>
                  </div>

                  <section className="adminDetailGrid">

                    <article className="adminPanel">
                      <h2>Complaint details</h2>

                      <p className="adminMuted">
                        Reference: {selectedComplaint.reference_number}
                      </p>

                      <h3 style={{ marginTop: 22 }}>
                        {selectedComplaint.title}
                      </h3>

                      <p className="adminDescription">
                        {selectedComplaint.description}
                      </p>

                      <div className="adminDetailInfo">
                        <div className="adminInfoCell">
                          <small>Reporter</small>
                          <strong>{selectedComplaint.reporter_name}</strong>
                        </div>

                        <div className="adminInfoCell">
                          <small>Area</small>
                          <strong>
                            {selectedComplaint.area || 'Not supplied'}
                          </strong>
                        </div>

                        <div className="adminInfoCell">
                          <small>Category</small>
                          <strong>
                            {selectedComplaint.predicted_category || 'Unclassified'}
                          </strong>
                        </div>

                        <div className="adminInfoCell">
                          <small>Priority</small>
                          <strong style={{ textTransform: 'capitalize' }}>
                            {selectedComplaint.priority}
                          </strong>
                        </div>

                        <div className="adminInfoCell">
                          <small>Status</small>
                          <strong>
                            {STATUS_LABELS[selectedComplaint.status] ||
                              selectedComplaint.status}
                          </strong>
                        </div>

                        <div className="adminInfoCell">
                          <small>Date submitted</small>
                          <strong>
                            {new Date(
                              selectedComplaint.created_at
                            ).toLocaleString()}
                          </strong>
                        </div>

                        <div className="adminInfoCell">
                          <small>Latitude</small>
                          <strong>
                            {selectedComplaint.latitude ?? 'Not supplied'}
                          </strong>
                        </div>

                        <div className="adminInfoCell">
                          <small>Longitude</small>
                          <strong>
                            {selectedComplaint.longitude ?? 'Not supplied'}
                          </strong>
                        </div>
                      </div>

                      {selectedComplaint.photo_url && (
                        <div className="adminEditSection">
                          <h3>Uploaded issue photograph</h3>

                          <a
                            href={`${API}${selectedComplaint.photo_url}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'block',
                              maxWidth: '100%'
                            }}
                          >
                            <img
                              src={`${API}${selectedComplaint.photo_url}`}
                              alt="Photograph uploaded with complaint"
                              style={{
                                width: '100%',
                                maxHeight: 360,
                                objectFit: 'contain',
                                borderRadius: 10,
                                background: '#f7f9fc',
                                border: '1px solid #e7ebf2'
                              }}
                            />
                          </a>

                          <p className="adminMuted">
                            Select the photograph to open the original image.
                          </p>
                        </div>
                      )}

                      {selectedComplaint.latitude != null &&
                        selectedComplaint.longitude != null && (
                          <div className="adminEditSection">
                            <h3>Reported issue location</h3>

                            <p className="adminMuted">
                              Map position selected by the person who
                              submitted this complaint.
                            </p>

                            <LocationMap
                              position={[
                                Number(selectedComplaint.latitude),
                                Number(selectedComplaint.longitude)
                              ]}
                              height="300px"
                              zoom={15}
                              interactive={false}
                            />

                            <p className="adminMuted">
                              Coordinates: {selectedComplaint.latitude},
                              {' '}
                              {selectedComplaint.longitude}
                            </p>

                            <a
                              href={`https://www.google.com/maps?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-block',
                                marginTop: 8,
                                color: '#2457a3',
                                fontWeight: 600,
                                fontSize: 13
                              }}
                            >
                              Open location in Google Maps
                            </a>
                          </div>
                        )}

                      {!selectedComplaint.photo_url &&
                        (selectedComplaint.latitude == null ||
                          selectedComplaint.longitude == null) && (
                          <div className="adminEditSection">
                            <p className="adminMuted">
                              No photograph or map location was supplied
                              with this complaint.
                            </p>
                          </div>
                        )}

                      {/* STATUS UPDATE */}

                      <div className="adminEditSection">
                        <h3>Update complaint status</h3>

                        <label className="adminField">
                          New status

                          <select
                            className="adminSelect"
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value)}
                          >
                            {STATUSES.map(status => (
                              <option value={status} key={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="adminField">
                          Update comment

                          <textarea
                            className="adminTextarea"
                            rows="2"
                            maxLength={2000}
                            value={statusComment}
                            onChange={e => setStatusComment(e.target.value)}
                            placeholder="Explain the status update..."
                          />
                        </label>

                        <button
                          className="adminButton adminPrimary"
                          disabled={
                            actionBusy ||
                            editStatus === selectedComplaint.status
                          }
                          onClick={saveStatus}
                        >
                          Save status
                        </button>
                      </div>

                      {/* CATEGORY CORRECTION */}

                      <div className="adminEditSection">
                        <h3>Correct complaint category</h3>

                        <label className="adminField">
                          Category

                          <select
                            className="adminSelect"
                            value={editCategory}
                            onChange={e => setEditCategory(e.target.value)}
                          >
                            {CATEGORIES.map(category => (
                              <option value={category} key={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="adminField">
                          Reason for correction

                          <textarea
                            className="adminTextarea"
                            rows="2"
                            maxLength={2000}
                            value={categoryComment}
                            onChange={e => setCategoryComment(e.target.value)}
                            placeholder="Explain why the category needs correction..."
                          />
                        </label>

                        <button
                          className="adminButton adminPrimary"
                          disabled={
                            actionBusy ||
                            editCategory === selectedComplaint.predicted_category
                          }
                          onClick={saveCategory}
                        >
                          Save category
                        </button>
                      </div>

                      {/* PRIORITY CORRECTION */}

                      <div className="adminEditSection">
                        <h3>Correct complaint priority</h3>

                        <label className="adminField">
                          Priority

                          <select
                            className="adminSelect"
                            value={editPriority}
                            onChange={e => setEditPriority(e.target.value)}
                          >
                            {PRIORITIES.map(priority => (
                              <option value={priority} key={priority}>
                                {priority.charAt(0).toUpperCase() +
                                  priority.slice(1)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="adminField">
                          Reason for correction

                          <textarea
                            className="adminTextarea"
                            rows="2"
                            maxLength={2000}
                            value={priorityComment}
                            onChange={e => setPriorityComment(e.target.value)}
                            placeholder="Explain why the priority needs correction..."
                          />
                        </label>

                        <button
                          className="adminButton adminPrimary"
                          disabled={
                            actionBusy ||
                            editPriority === selectedComplaint.priority
                          }
                          onClick={savePriority}
                        >
                          Save priority
                        </button>
                      </div>
                    </article>

                    {/* AUDIT HISTORY */}

                    <article className="adminPanel">
                      <h2>Complaint audit history</h2>

                      <p className="adminMuted">
                        Recorded actions and administrative changes.
                      </p>

                      {detailLoading ? (
                        <p className="adminEmpty">Loading history...</p>
                      ) : complaintHistory.length === 0 ? (
                        <p className="adminEmpty">No history available.</p>
                      ) : (
                        <div className="adminHistory">
                          {complaintHistory.map(item => (
                            <div className="adminHistoryItem" key={item.id}>
                              <strong>
                                {item.old_status === item.new_status
                                  ? 'Complaint information updated'
                                  : `${
                                      STATUS_LABELS[item.old_status] ||
                                      item.old_status ||
                                      'Created'
                                    } → ${
                                      STATUS_LABELS[item.new_status] ||
                                      item.new_status
                                    }`}
                              </strong>

                              <p>
                                {item.comment || 'No comment supplied.'}
                              </p>

                              <small>
                                By {item.updated_by || 'Unknown'}
                              </small>

                              <br />

                              <small>
                                {new Date(item.created_at).toLocaleString()}
                              </small>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>

                  </section>
                </>
              ) : (
                /* COMPLAINT MANAGEMENT TABLE */

                <section className="adminPanel">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 15,
                      flexWrap: 'wrap'
                    }}
                  >
                    <div>
                      <h2>Complaint management</h2>

                      <p className="adminMuted">
                        Review community reports and manage their progress.
                      </p>
                    </div>

                    <button
                      className="adminButton"
                      disabled={adminLoading}
                      onClick={() => loadAdminDashboard()}
                    >
                      <RefreshCw size={16} />
                      {adminLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>

                  <div className="adminFilters">
                    <div className="adminSearch">
                      <Search size={16} />

                      <input
                        className="adminInput"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search title, reference, area..."
                      />
                    </div>

                    <select
                      className="adminSelect"
                      style={{ width: 'auto', minWidth: 180 }}
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All statuses</option>

                      {STATUSES.map(status => (
                        <option value={status} key={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="adminTableWrap">
                    <table className="adminTable">
                      <thead>
                        <tr>
                          <th>Complaint</th>
                          <th>Reference</th>
                          <th>Category</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Area</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredComplaints.map(complaint => (
                          <tr key={complaint.id}>
                            <td>
                              <strong>{complaint.title}</strong>

                              <span className="adminMuted">
                                {complaint.reporter_name}
                              </span>
                            </td>

                            <td>{complaint.reference_number}</td>

                            <td>
                              {complaint.predicted_category || 'Unclassified'}
                            </td>

                            <td>
                              <span className={`adminBadge ${complaint.priority}`}>
                                {complaint.priority}
                              </span>
                            </td>

                            <td>
                              <span className={`adminBadge ${complaint.status}`}>
                                {STATUS_LABELS[complaint.status] ||
                                  complaint.status}
                              </span>
                            </td>

                            <td>
                              {complaint.area || 'Not supplied'}
                            </td>

                            <td>
                              <button
                                className="adminRowButton"
                                onClick={() => openComplaint(complaint.id)}
                              >
                                View details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {filteredComplaints.length === 0 && (
                      <div className="adminEmpty">
                        <ClipboardList size={30} />
                        <p>No complaints match your search.</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              <footer className="adminFooter">
                SmartMunicipality AI · Municipal Administration Portal
                <br />
                Administrative actions are recorded in complaint history.
              </footer>
            </>
          )}
        </div>
      </main>
    );
  }

  // =====================================================
  // CITIZEN PORTAL VIEW
  // =====================================================

  return (
    <main className="shell">

      {/* HEADER */}

      <header className="topbar">
        <div className="brand">
          <div className="brandIcon">SA</div>

          <div>
            <strong>
              SmartMunicipality <span>AI</span>
            </strong>

            <small>
              Community reporting & service delivery
            </small>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap'
          }}
        >
          <div className="live">
            <i />
            API-powered dashboard
          </div>

          <button
            className="refresh"
            onClick={() => {
              setAdminMessage('');
              setView('admin');
            }}
          >
            <LockKeyhole size={16} />
            Admin Portal
          </button>
        </div>
      </header>

      {/* HERO */}

      <section className="hero">
        <div>
          <p className="eyebrow">YOUR COMMUNITY. YOUR VOICE.</p>

          <h1>
            Report local issues.
            <br />
            <em>Track real progress.</em>
          </h1>

          <p className="heroText">
            A central platform for reporting infrastructure and service
            delivery problems. AI helps organise complaints for municipal
            review and action.
          </p>

          <a className="heroLink" href="#report">
            Report an issue <span>↓</span>
          </a>
        </div>

        <div className="heroArt">
          <div className="orbit orbit1" />
          <div className="orbit orbit2" />

          <div className="city">
            <span>▥</span>
            <span>▤</span>
            <span>▥</span>
            <span>▦</span>
          </div>

          <div className="pin">
            <MapPin size={27} />
          </div>

          <div className="artLabel">
            <Sparkles size={16} />
            AI-assisted reporting
          </div>
        </div>
      </section>

      {/* ANALYTICS DASHBOARD */}

      <section className="dashboardSection">

        <div className="dashboardHeading">
          <div>
            <p className="eyebrow">MUNICIPAL OVERVIEW</p>
            <h2>Service delivery dashboard</h2>
            <p>
              Live statistics from registered community complaints.
            </p>
          </div>

          <button
            className="refresh"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={16} />
            {loading ? 'Refreshing...' : 'Refresh data'}
          </button>
        </div>

        {/* STAT CARDS */}

        <div className="stats">
          <article>
            <ClipboardList />
            <small>Total complaints</small>
            <strong>{total}</strong>
          </article>

          <article>
            <Activity />
            <small>Active complaints</small>
            <strong>{activeComplaints}</strong>
          </article>

          <article>
            <CheckCircle2 />
            <small>Resolved complaints</small>
            <strong>{resolved}</strong>
          </article>

          <article>
            <AlertTriangle />
            <small>High / critical</small>
            <strong>{urgent}</strong>
          </article>
        </div>

        {/* RESOLUTION SUMMARY */}

        <div className="analyticsGrid">

          <article className="panel analyticsCard">
            <div className="analyticsTitle">
              <div>
                <p className="eyebrow">PERFORMANCE</p>
                <h3>Resolution rate</h3>
              </div>

              <CheckCircle2 />
            </div>

            <strong className="bigMetric">
              {resolutionRate}%
            </strong>

            <div className="progressTrack">
              <div
                className="progressFill"
                style={{
                  width: `${Math.min(resolutionRate, 100)}%`
                }}
              />
            </div>

            <div className="metricFooter">
              <span>{resolved} resolved</span>
              <span>{unresolved} unresolved</span>
            </div>
          </article>

          <article className="panel analyticsCard">
            <div className="analyticsTitle">
              <div>
                <p className="eyebrow">PRIORITY MONITORING</p>
                <h3>Urgent complaints</h3>
              </div>

              <ShieldAlert />
            </div>

            <strong className="bigMetric">
              {urgent}
            </strong>

            <div className="priorityBreakdown">
              <span>
                <i className="dot highDot" />
                High: {priorities.high || 0}
              </span>

              <span>
                <i className="dot criticalDot" />
                Critical: {priorities.critical || 0}
              </span>
            </div>
          </article>

        </div>

        {/* CATEGORY AND STATUS BREAKDOWN */}

        <div className="analyticsGrid">

          <article className="panel breakdownPanel">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">CLASSIFICATION</p>
                <h2>Complaints by category</h2>
              </div>

              <BarChart3 />
            </div>

            {Object.keys(categories).length === 0 ? (
              <p className="emptyText">
                No category data available.
              </p>
            ) : (
              <div className="barList">
                {Object.entries(categories).map(([name, value], index) => {
                  const percentage = total
                    ? (value / total) * 100
                    : 0;

                  return (
                    <div className="barItem" key={name}>
                      <div className="barLabel">
                        <span>{name || 'Unclassified'}</span>
                        <strong>{value}</strong>
                      </div>

                      <div className="progressTrack">
                        <div
                          className="categoryBar"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor:
                              categoryColors[index % categoryColors.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="panel breakdownPanel">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">WORKFLOW TRACKING</p>
                <h2>Complaints by status</h2>
              </div>

              <Clock3 />
            </div>

            {Object.keys(statuses).length === 0 ? (
              <p className="emptyText">
                No status data available.
              </p>
            ) : (
              <div className="statusList">
                {Object.entries(statuses).map(([name, value]) => {
                  const percentage = total
                    ? (value / total) * 100
                    : 0;

                  return (
                    <div className="statusItem" key={name}>
                      <div className="statusLabel">
                        <span>
                          {STATUS_LABELS[name] || name}
                        </span>

                        <strong>{value}</strong>
                      </div>

                      <div className="progressTrack">
                        <div
                          className="statusBar"
                          style={{
                            width: `${percentage}%`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

        </div>

      </section>

      {/* CITIZEN REPORTING AND RECENT COMPLAINTS */}

      <section className="contentGrid">

        <form
          className="panel report"
          id="report"
          onSubmit={submit}
        >
          <div className="sectionHead">
            <div>
              <p className="eyebrow">CITIZEN PORTAL</p>
              <h2>Report a community issue</h2>
            </div>

            <span className="step">01 / REPORT</span>
          </div>

          <label>
            Your name

            <input
              required
              minLength="2"
              value={form.reporter_name}
              onChange={e => update('reporter_name', e.target.value)}
              placeholder="e.g. Thandi Mokoena"
            />
          </label>

          <label>
            Contact details (optional)

            <input
              value={form.reporter_contact}
              onChange={e => update('reporter_contact', e.target.value)}
              placeholder="Email or phone"
            />
          </label>

          <label>
            Issue title

            <input
              required
              minLength="5"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="e.g. Water leak on Main Road"
            />
          </label>

          <label>
            Describe the problem

            <textarea
              required
              minLength="15"
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Tell us what happened, where it happened and how it affects the community."
            />
          </label>

          <label>
            Area / suburb

            <input
              value={form.area}
              onChange={e => update('area', e.target.value)}
              placeholder="e.g. Soweto, Johannesburg"
            />
          </label>

          <ComplaintEvidence
            photo={photo}
            setPhoto={setPhoto}
            location={location}
            setLocation={setLocation}
          />

          <button
            disabled={busy}
            className="submit"
            type="submit"
          >
            <Send size={17} />
            {busy ? 'Submitting...' : 'Submit report'}
          </button>

          {message && (
            <div
              className={`notice ${messageType}`}
              role="status"
            >
              {message}
            </div>
          )}

          <p className="fine">
            Prototype only. Do not submit sensitive personal information
            or emergency reports. AI suggestions are not official decisions.
          </p>
        </form>

        {/* RECENT REPORTS */}

        <aside className="panel activityPanel">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">SERVICE DELIVERY</p>
              <h2>Recent reports</h2>
            </div>

            <span className="count">
              {complaints.length} shown
            </span>
          </div>

          {complaints.length === 0 ? (
            <div className="empty">
              <MapPin size={30} />
              <strong>No reports yet</strong>
              <span>
                Submitted community reports will appear here.
              </span>
            </div>
          ) : (
            <div className="reportList">
              {complaints.slice(0, 8).map(c => (
                <article className="reportItem" key={c.id}>
                  <div className="itemTop">
                    <strong>{c.title}</strong>

                    <span className={`priority ${c.priority}`}>
                      {c.priority}
                    </span>
                  </div>

                  <p>
                    {c.predicted_category || 'Awaiting category'}
                    {' · '}
                    {c.area || 'Area not supplied'}
                  </p>

                  <div className="itemBottom">
                    <code>{c.reference_number}</code>

                    <span>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          <button
            className="refresh"
            onClick={refresh}
            disabled={loading}
          >
            Refresh reports
          </button>
        </aside>

      </section>

      {/* AI MUNICIPAL ASSISTANT */}

      <MunicipalAssistant apiUrl={API} />

      {/* FOOTER */}

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <h2>SmartMunicipality <span>AI</span></h2>
            <p>
              Smarter reporting. Better communities.
              Building a more connected and responsive municipality.
            </p>
          </div>

          <div className="footer-column">
            <h3>Quick Links</h3>
            <a href="#home">Home</a>
            <a href="#report">Report an Issue</a>
            <a href="#track">Track Complaint</a>
          </div>

          <div className="footer-column">
            <h3>Get in Touch</h3>
            <a href="mailto:reportissues@smartmunicipality.com">
              <span>✉</span> Email Support
            </a>
            <a href="tel:+27115789000">
              <span>☎</span> Call Support
            </a>
            <p>South Africa</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 SmartMunicipality AI. All rights reserved.</p>
          <small>Community prototype · Not an official municipal channel</small>
        </div>
      </footer>

    </main>
  );
}