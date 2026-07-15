// /frontend/src/pages/Admin/Transactions.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './Transactions.css';

// ============================================================
// INLINE SVG ICONS (No external dependencies)
// ============================================================

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const XCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const DollarSignIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const PackageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" />
    <polyline points="2.32 6.16 12 11 21.68 6.16" />
    <line x1="12" y1="22.76" x2="12" y2="11" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const RefreshCwIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  
  // ✅ FIX: API_URL without /api at the end
  const API_URL = import.meta.env.VITE_API_URL || '';
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    itemType: 'all',
    search: '',
    startDate: '',
    endDate: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  
  // UI State
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });

  // Fetch transactions from admin endpoint
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please login to view transactions');
        setLoading(false);
        return;
      }
      
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction
      });
      
      // Add filters
      if (filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.itemType !== 'all') queryParams.append('itemType', filters.itemType);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      // ✅ FIX: Use API_URL without /api at the end, then add /api/
      const response = await fetch(`${API_URL}/admin/transactions?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTransactions(data.data?.transactions || []);
        setStats(data.data?.stats);
        setPagination(prev => ({
          ...prev,
          total: data.data?.pagination?.total || 0,
          pages: data.data?.pagination?.pages || 0
        }));
      } else {
        setError(data.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortConfig, filters, API_URL]);

  // Fetch stats only
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return;
      }
      
      // ✅ FIX: Use API_URL without /api at the end, then add /api/
      const response = await fetch(`${API_URL}/admin/transactions/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (response.ok && data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [API_URL]);

  // Initial load
  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, [fetchTransactions, fetchStats]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // Handle transaction action (verify, deliver, reject)
  const handleTransactionAction = async (transactionId, action, reason = '') => {
    if (!window.confirm(`Are you sure you want to ${action} this transaction?`)) {
      return;
    }
    
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let method = 'PUT';
      let body = {};
      
      switch (action) {
        case 'verify':
          endpoint = `${API_URL}/admin/transactions/${transactionId}/verify`;
          break;
        case 'deliver':
          endpoint = `${API_URL}/admin/transactions/${transactionId}/deliver`;
          break;
        case 'reject':
          endpoint = `${API_URL}/admin/transactions/${transactionId}/reject`;
          body = { reason: reason || 'Transaction rejected by admin' };
          break;
        default:
          throw new Error('Invalid action');
      }
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: Object.keys(body).length ? JSON.stringify(body) : undefined
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        alert(`✅ Transaction ${action}ed successfully!`);
        fetchTransactions();
        fetchStats();
        if (showDetailsModal) {
          setShowDetailsModal(false);
          setSelectedTransaction(null);
        }
      } else {
        alert(`❌ Error: ${data.message || 'Failed to process transaction'}`);
      }
    } catch (err) {
      console.error(`Error ${action}ing transaction:`, err);
      alert('❌ Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy UTR to clipboard
  const copyUtr = (utr) => {
    navigator.clipboard.writeText(utr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get status badge class
  const getStatusBadge = (status) => {
    const classes = {
      pending: 'status-badge pending',
      verified: 'status-badge verified',
      delivered: 'status-badge delivered',
      rejected: 'status-badge rejected'
    };
    return classes[status] || 'status-badge';
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockIcon />;
      case 'verified': return <CheckCircleIcon />;
      case 'delivered': return <CheckCircleIcon />;
      case 'rejected': return <XCircleIcon />;
      default: return null;
    }
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get item type icon
  const getItemTypeIcon = (type) => {
    switch (type) {
      case 'shards': return <PackageIcon />;
      case 'seasonpass': return <CalendarIcon />;
      case 'bundle': return <PackageIcon />;
      default: return <PackageIcon />;
    }
  };

  return (
    <div className="transactions-page">
      {/* Header */}
      <div className="transactions-header">
        <div className="header-left">
          <h1 className="page-title">Transactions</h1>
          <span className="transaction-count">
            {pagination.total} total transactions
          </span>
        </div>
        <div className="header-actions">
          <button 
            className="btn-refresh" 
            onClick={() => {
              fetchTransactions();
              fetchStats();
            }}
            disabled={loading}
          >
            <RefreshCwIcon />
            Refresh
          </button>
          <button className="btn-export">
            <DownloadIcon />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon pending-icon">
              <ClockIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.pendingCount || 0}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon verified-icon">
              <CheckCircleIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.verifiedCount || 0}</span>
              <span className="stat-label">Verified</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon delivered-icon">
              <DollarSignIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">₹{stats.totalRevenue || 0}</span>
              <span className="stat-label">Total Revenue</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon users-icon">
              <UsersIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalTransactions || 0}</span>
              <span className="stat-label">Total Transactions</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <form onSubmit={handleSearch} className="filters-form">
          <div className="filter-group search-group">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search by UTR or username..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="delivered">Delivered</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div className="filter-group">
            <select
              value={filters.itemType}
              onChange={(e) => handleFilterChange('itemType', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="shards">Shards</option>
              <option value="seasonpass">Season Pass</option>
              <option value="bundle">Bundle</option>
            </select>
          </div>
          
          <div className="filter-group date-group">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="filter-date"
              placeholder="Start Date"
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="filter-date"
              placeholder="End Date"
            />
          </div>
          
          <button type="submit" className="btn-apply-filters">
            Apply Filters
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <AlertCircleIcon />
          {error}
          <button onClick={() => setError('')} className="error-dismiss">×</button>
        </div>
      )}

      {/* Transactions Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <PackageIcon />
            <h3>No transactions found</h3>
            <p>Try adjusting your filters or search query</p>
          </div>
        ) : (
          <table className="transactions-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('createdAt')} className="sortable">
                  Date
                  {sortConfig.key === 'createdAt' && (
                    sortConfig.direction === 'desc' ? <ChevronDownIcon /> : <ChevronUpIcon />
                  )}
                </th>
                <th>User</th>
                <th onClick={() => handleSort('utrNumber')} className="sortable">
                  UTR
                  {sortConfig.key === 'utrNumber' && (
                    sortConfig.direction === 'desc' ? <ChevronDownIcon /> : <ChevronUpIcon />
                  )}
                </th>
                <th onClick={() => handleSort('paidAmount')} className="sortable">
                  Amount
                  {sortConfig.key === 'paidAmount' && (
                    sortConfig.direction === 'desc' ? <ChevronDownIcon /> : <ChevronUpIcon />
                  )}
                </th>
                <th>Item</th>
                <th onClick={() => handleSort('status')} className="sortable">
                  Status
                  {sortConfig.key === 'status' && (
                    sortConfig.direction === 'desc' ? <ChevronDownIcon /> : <ChevronUpIcon />
                  )}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction._id} className="transaction-row">
                  <td className="date-cell">
                    <span className="date-main">{formatDate(transaction.createdAt)}</span>
                    <span className="date-time">{new Date(transaction.createdAt).toLocaleTimeString()}</span>
                  </td>
                  <td className="user-cell">
                    <div className="user-info">
                      <div className="user-avatar">
                        {transaction.userId?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="user-details">
                        <span className="username">{transaction.userId?.username || 'Unknown'}</span>
                        <span className="user-email">{transaction.userId?.email || ''}</span>
                      </div>
                    </div>
                  </td>
                  <td className="utr-cell">
                    <div className="utr-container">
                      <span className="utr-text">{transaction.utrNumber}</span>
                      <button 
                        className="copy-utr-btn" 
                        onClick={() => copyUtr(transaction.utrNumber)}
                        title="Copy UTR"
                      >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </div>
                  </td>
                  <td className="amount-cell">
                    <div className="amount-info">
                      <span className="paid-amount">{formatCurrency(transaction.paidAmount)}</span>
                      <span className="expected-amount">Expected: {formatCurrency(transaction.expectedAmount)}</span>
                      {transaction.paidAmount !== transaction.expectedAmount && (
                        <span className={`amount-diff ${transaction.paidAmount > transaction.expectedAmount ? 'over' : 'under'}`}>
                          {transaction.paidAmount > transaction.expectedAmount ? '+' : '-'}
                          {formatCurrency(Math.abs(transaction.paidAmount - transaction.expectedAmount))}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="item-cell">
                    <div className="item-info">
                      {getItemTypeIcon(transaction.itemType)}
                      <div className="item-details">
                        <span className="item-name">{transaction.itemName}</span>
                        <span className="item-type">{transaction.itemType}</span>
                      </div>
                    </div>
                  </td>
                  <td className="status-cell">
                    <span className={getStatusBadge(transaction.status)}>
                      {getStatusIcon(transaction.status)}
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button
                        className="action-btn view"
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowDetailsModal(true);
                        }}
                        title="View Details"
                      >
                        <EyeIcon />
                      </button>
                      
                      {transaction.status === 'pending' && (
                        <>
                          <button
                            className="action-btn verify"
                            onClick={() => handleTransactionAction(transaction._id, 'verify')}
                            disabled={actionLoading}
                            title="Verify Transaction"
                          >
                            <CheckCircleIcon />
                          </button>
                          <button
                            className="action-btn reject"
                            onClick={() => {
                              const reason = prompt('Enter reason for rejection:');
                              if (reason !== null) {
                                handleTransactionAction(transaction._id, 'reject', reason);
                              }
                            }}
                            disabled={actionLoading}
                            title="Reject Transaction"
                          >
                            <XCircleIcon />
                          </button>
                        </>
                      )}
                      
                      {transaction.status === 'verified' && (
                        <button
                          className="action-btn deliver"
                          onClick={() => handleTransactionAction(transaction._id, 'deliver')}
                          disabled={actionLoading}
                          title="Deliver Item"
                        >
                          <PackageIcon />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && transactions.length > 0 && (
        <div className="pagination-section">
          <div className="pagination-info">
            Showing {((pagination.page - 1) * pagination.limit) + 1} - 
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </div>
          <div className="pagination-controls">
            <button
              className="page-btn"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ArrowLeftIcon />
              Previous
            </button>
            
            <div className="page-numbers">
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                let pageNum;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`page-number ${pagination.page === pageNum ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {pagination.pages > 5 && pagination.page < pagination.pages - 2 && (
                <span className="page-ellipsis">…</span>
              )}
            </div>
            
            <button
              className="page-btn"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              Next
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="details-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="details-modal-header">
              <h3>Transaction Details</h3>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                ×
              </button>
            </div>
            
            <div className="details-modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>UTR Number</label>
                  <div className="detail-utr">
                    <span>{selectedTransaction.utrNumber}</span>
                    <button onClick={() => copyUtr(selectedTransaction.utrNumber)}>
                      {copied ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>
                </div>
                
                <div className="detail-item">
                  <label>Status</label>
                  <span className={getStatusBadge(selectedTransaction.status)}>
                    {getStatusIcon(selectedTransaction.status)}
                    {selectedTransaction.status}
                  </span>
                </div>
                
                <div className="detail-item">
                  <label>User</label>
                  <span>{selectedTransaction.userId?.username || 'Unknown'}</span>
                  <small>{selectedTransaction.userId?.email || ''}</small>
                </div>
                
                <div className="detail-item">
                  <label>Item</label>
                  <span>{selectedTransaction.itemName}</span>
                  <small>{selectedTransaction.itemType}</small>
                </div>
                
                <div className="detail-item">
                  <label>Paid Amount</label>
                  <span className="highlight">{formatCurrency(selectedTransaction.paidAmount)}</span>
                </div>
                
                <div className="detail-item">
                  <label>Expected Amount</label>
                  <span>{formatCurrency(selectedTransaction.expectedAmount)}</span>
                </div>
                
                <div className="detail-item">
                  <label>Created At</label>
                  <span>{formatDate(selectedTransaction.createdAt)}</span>
                </div>
                
                {selectedTransaction.verifiedAt && (
                  <div className="detail-item">
                    <label>Verified At</label>
                    <span>{formatDate(selectedTransaction.verifiedAt)}</span>
                  </div>
                )}
                
                {selectedTransaction.deliveredAt && (
                  <div className="detail-item">
                    <label>Delivered At</label>
                    <span>{formatDate(selectedTransaction.deliveredAt)}</span>
                  </div>
                )}
                
                {selectedTransaction.notes && (
                  <div className="detail-item full-width">
                    <label>Notes</label>
                    <p>{selectedTransaction.notes}</p>
                  </div>
                )}
                
                {selectedTransaction.metadata && (
                  <div className="detail-item full-width">
                    <label>Metadata</label>
                    <div className="metadata-display">
                      <span>IP: {selectedTransaction.metadata.ipAddress || 'N/A'}</span>
                      <span>Device: {selectedTransaction.metadata.deviceInfo || 'N/A'}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="details-modal-actions">
                {selectedTransaction.status === 'pending' && (
                  <>
                    <button
                      className="btn-verify"
                      onClick={() => handleTransactionAction(selectedTransaction._id, 'verify')}
                      disabled={actionLoading}
                    >
                      <CheckCircleIcon />
                      Verify
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => {
                        const reason = prompt('Enter reason for rejection:');
                        if (reason !== null) {
                          handleTransactionAction(selectedTransaction._id, 'reject', reason);
                        }
                      }}
                      disabled={actionLoading}
                    >
                      <XCircleIcon />
                      Reject
                    </button>
                  </>
                )}
                {selectedTransaction.status === 'verified' && (
                  <button
                    className="btn-deliver"
                    onClick={() => handleTransactionAction(selectedTransaction._id, 'deliver')}
                    disabled={actionLoading}
                  >
                    <PackageIcon />
                    Deliver Item
                  </button>
                )}
                <button
                  className="btn-close-modal"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;