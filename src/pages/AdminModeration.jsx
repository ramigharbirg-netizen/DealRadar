import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Flag,
  EyeOff,
  RotateCcw,
  Trash2,
  Loader2,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const formatHiddenReason = (reason) => {
  const reasons = {
    too_many_reports: 'Troppe segnalazioni',
    deleted_by_admin: 'Nascosta da admin',
    admin_moderation: 'Moderazione admin',
  };

  return reasons[reason] || reason || '-';
};

export const AdminModeration = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const checkAdmin = useCallback(async () => {
    if (!user) return;

    setCheckingAdmin(true);

    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const hasAdminRole = Array.isArray(data)
        ? data.some((row) => row.role === 'admin' || row.role === 'owner')
        : false;

      setIsAdmin(hasAdminRole);
    } catch (err) {
      console.error('Admin check error:', err);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  }, [user]);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);

    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          created_at,
          reporter_id,
          opportunity_id,
          reason,
          details,
          status,
          opportunities (
            id,
            title,
            description,
            category,
            address,
            reports,
            is_hidden,
            hidden_reason,
            user_id,
            user_name,
            created_at
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load reports error:', err);
      toast.error('Errore nel caricamento segnalazioni');
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    checkAdmin();
  }, [authLoading, user, navigate, checkAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadReports();
    }
  }, [isAdmin, loadReports]);

  const updateReportStatus = async (reportId, status) => {
    const { error } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', reportId);

    if (error) throw error;
  };

  const hideOpportunity = async (report) => {
    if (!report?.opportunity_id) return;

    setActionLoadingId(report.id);

    try {
      const { error } = await supabase
        .from('opportunities')
        .update({
          is_hidden: true,
          hidden_reason: 'admin_moderation',
        })
        .eq('id', report.opportunity_id);

      if (error) throw error;

      await updateReportStatus(report.id, 'resolved');

      toast.success('Opportunità nascosta');
      await loadReports();
    } catch (err) {
      console.error('Hide opportunity error:', err);
      toast.error('Errore durante la moderazione');
    } finally {
      setActionLoadingId(null);
    }
  };

  const restoreOpportunity = async (report) => {
    if (!report?.opportunity_id) return;

    setActionLoadingId(report.id);

    try {
      const { error } = await supabase
        .from('opportunities')
        .update({
          is_hidden: false,
          hidden_reason: null,
          reports: 0,
        })
        .eq('id', report.opportunity_id);

      if (error) throw error;

      await updateReportStatus(report.id, 'resolved');

      toast.success('Opportunità ripristinata');
      await loadReports();
    } catch (err) {
      console.error('Restore opportunity error:', err);
      toast.error('Errore durante il ripristino');
    } finally {
      setActionLoadingId(null);
    }
  };

  const deleteOpportunity = async (report) => {
    if (!report?.opportunity_id) return;

    const confirmed = window.confirm(
      'Vuoi nascondere definitivamente questa opportunità dal feed? Potrai ancora recuperarla dal database se necessario.'
    );

    if (!confirmed) return;

    setActionLoadingId(report.id);

    try {
      const { error } = await supabase
        .from('opportunities')
        .update({
          is_hidden: true,
          hidden_reason: 'deleted_by_admin',
        })
        .eq('id', report.opportunity_id);

      if (error) throw error;

      await updateReportStatus(report.id, 'resolved');

      toast.success('Opportunità nascosta definitivamente');
      await loadReports();
    } catch (err) {
      console.error('Delete opportunity error:', err);
      toast.error('Errore durante eliminazione');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <Shield className="mb-4 h-12 w-12 text-red-500" />

        <h1 className="text-xl font-bold text-gray-900">Accesso negato</h1>

        <p className="mt-2 text-sm text-gray-500">
          Non hai i permessi per accedere alla moderazione.
        </p>

        <Button className="mt-4" onClick={() => navigate('/feed')}>
          Torna al feed
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div>
              <h1 className="text-lg font-bold text-gray-900">Moderazione</h1>
              <p className="text-xs text-gray-500">
                Segnalazioni contenuti DealRadar
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={loadReports}
            disabled={loadingReports}
          >
            <RefreshCw
              className={`h-5 w-5 ${loadingReports ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Flag className="h-5 w-5 text-red-600" />
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Segnalazioni da gestire: {reports.length}
              </p>

              <p className="text-xs text-gray-500">
                Controlla, nascondi, ripristina o elimina contenuti problematici.
              </p>
            </div>
          </div>
        </div>

        {loadingReports ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <Shield className="mx-auto mb-3 h-10 w-10 text-green-500" />

            <h2 className="font-bold text-gray-900">
              Nessuna segnalazione da gestire
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Al momento non ci sono contenuti da revisionare.
            </p>
          </div>
        ) : (
          reports.map((report) => {
            const opp = report.opportunities;
            const isLoading = actionLoadingId === report.id;
            const reportsCount = Number(opp?.reports || 0);

            return (
              <div
                key={report.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        {report.reason || 'segnalazione'}
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                        {report.status || 'pending'}
                      </span>

                      {opp?.is_hidden && (
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                          nascosta
                        </span>
                      )}

                      {opp?.hidden_reason && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                          {formatHiddenReason(opp.hidden_reason)}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base font-bold text-gray-900">
                      {opp?.title || 'Opportunità non trovata'}
                    </h2>

                    <p className="mt-1 text-xs text-gray-500">
                      Segnalata il{' '}
                      {report.created_at
                        ? new Date(report.created_at).toLocaleString('it-IT')
                        : '-'}
                    </p>

                    {opp?.address && (
                      <p className="mt-1 text-xs text-gray-500">{opp.address}</p>
                    )}
                  </div>
                </div>

                {report.details && (
                  <div className="mb-3 rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500">
                      Dettagli segnalazione
                    </p>

                    <p className="mt-1 text-sm text-gray-700">{report.details}</p>
                  </div>
                )}

                {opp?.description && (
                  <p className="mb-3 line-clamp-3 text-sm text-gray-600">
                    {opp.description}
                  </p>
                )}

                <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-gray-500 sm:grid-cols-5">
                  <div>
                    <p className="font-semibold text-gray-700">Reports</p>

                    <span
                      className={`font-semibold ${
                        reportsCount >= 3 ? 'text-red-500' : 'text-gray-400'
                      }`}
                    >
                      {reportsCount}
                    </span>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-700">Autore</p>
                    <p>{opp?.user_name || 'Utente'}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-700">Categoria</p>
                    <p>{opp?.category || '-'}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-700">Motivo hidden</p>
                    <p>{formatHiddenReason(opp?.hidden_reason)}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-700">Stato</p>

                    <p
                      className={
                        opp?.is_hidden ? 'text-orange-600' : 'text-emerald-600'
                      }
                    >
                      {opp?.is_hidden ? 'Nascosta' : 'Attiva'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {opp?.is_hidden ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => restoreOpportunity(report)}
                      disabled={isLoading || !opp}
                      className="h-9"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      Ripristina
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => hideOpportunity(report)}
                      disabled={isLoading || !opp}
                      className="h-9"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <EyeOff className="mr-2 h-4 w-4" />
                      )}
                      Nascondi
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => deleteOpportunity(report)}
                    disabled={isLoading || !opp}
                    className="h-9 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Elimina
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminModeration;