import React, { useEffect, useMemo, useState } from 'react';
import { Brain, DollarSign, Plus, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { computeFinancialAnalysis } from '../services/analyticsService';
import type { FinancialAnalysis, TransactionCategory, TransactionType } from '../types';
import { Spinner } from './Spinner';
import { SectionHeading, StatTile, StatusChip, SurfaceCard } from './WorkspacePrimitives';

export const FinanceView: React.FC = () => {
  const { transactions, addTransaction, deleteTransaction, farms } = useAuth();
  const { t, language } = useTranslation();
  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<TransactionCategory>('Seeds');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [farmId, setFarmId] = useState('');

  const totalIncome = useMemo(() => transactions.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0), [transactions]);
  const totalExpenses = useMemo(() => transactions.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0), [transactions]);
  const netProfit = totalIncome - totalExpenses;

  useEffect(() => {
    if (transactions.length === 0) { setAnalysis(null); return; }
    setIsAnalyzing(true);
    setAnalysis(computeFinancialAnalysis(transactions, farms));
    setIsAnalyzing(false);
  }, [transactions, farms]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!amount || !description) return;

    setIsSaving(true);
    setFormError(null);
    try {
      await addTransaction({
        amount: parseFloat(amount),
        type,
        category,
        date,
        description,
        farmId: farmId || undefined,
      });

      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      setFarmId('');
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Transaction could not be saved. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ui-reveal space-y-6">
      <SectionHeading
        eyebrow={t('dashboard.finance.title')}
        title="Financial performance and transaction intelligence"
        description={t('dashboard.finance.subtitle')}
        actions={
          <button onClick={() => { setFormError(null); setIsModalOpen(true); }} className="ui-button ui-button-primary">
            <Plus size={18} />
            <span>{t('dashboard.finance.addTransaction')}</span>
          </button>
        }
      />

      <div className="ui-kpi-grid">
        <StatTile title={t('dashboard.finance.income')} value={`$${totalIncome.toLocaleString()}`} tone="forest" icon={<TrendingUp size={18} />} meta="Revenue collected across all tracked finance records." />
        <StatTile title={t('dashboard.finance.expenses')} value={`$${totalExpenses.toLocaleString()}`} tone="red" icon={<TrendingDown size={18} />} meta="Operating and production costs logged in the current portfolio." />
        <StatTile title={t('dashboard.finance.netProfit')} value={`$${netProfit.toLocaleString()}`} tone={netProfit >= 0 ? 'blue' : 'red'} icon={<DollarSign size={18} />} meta={netProfit >= 0 ? 'Current transaction mix indicates a positive operating margin.' : 'Expense pressure is currently above recorded revenue.'} />
      </div>

      {transactions.length > 0 ? (
        <SurfaceCard className="ui-surface p-6">
          <SectionHeading
            eyebrow={t('dashboard.finance.aiAnalysis')}
            title="AI financial readout"
            description="A business-grade interpretation of operational spend, revenue performance, and cost efficiency."
            icon={<Brain size={14} />}
          />

          <div className="mt-6 space-y-4">
            {isAnalyzing ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] px-4 py-4 text-sm font-semibold text-[var(--ag-text)]">
                <Spinner small />
                <span>{t('dashboard.finance.analyzing')}</span>
              </div>
            ) : analysis ? (
              <>
                {analysis.costPerUnit ? (
                  <div className="rounded-[1.2rem] border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] p-4">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ag-text-soft)]">Efficiency metric</div>
                    <p className="mt-3 text-base font-bold text-[var(--ag-text)]">{analysis.costPerUnit}</p>
                  </div>
                ) : null}

                <div className="ui-insight-list">
                  {analysis.aiInsights.map((insight, index) => (
                    <div key={`${insight.title}-${index}`} className="ui-insight-item">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[var(--ag-text)]">{insight.title}</p>
                          <p className="mt-2 text-sm leading-6 text-[var(--ag-text-muted)]">{insight.message}</p>
                        </div>
                        <StatusChip tone={insight.type === 'warning' ? 'red' : insight.type === 'success' ? 'forest' : 'blue'}>
                          {insight.type}
                        </StatusChip>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </SurfaceCard>
      ) : null}

      <div className="ui-table-card">
        <div className="border-b border-[var(--ag-border)] px-6 py-5">
          <SectionHeading
            eyebrow={t('dashboard.finance.transactionHistory')}
            title="Transaction ledger"
            description="A clean operating ledger with income, expenses, categories, and deletion controls."
          />
        </div>

        <div className="overflow-x-auto">
          <table className="ui-table-shell">
            <thead>
              <tr>
                <th>{t('dashboard.finance.modal.date')}</th>
                <th>{t('dashboard.finance.modal.category')}</th>
                <th>{t('dashboard.finance.modal.description')}</th>
                <th>{t('dashboard.finance.modal.amount')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                [...transactions]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(tx => (
                    <tr key={tx.id}>
                      <td className="text-sm text-[var(--ag-text-muted)]">{tx.date}</td>
                      <td>
                        <StatusChip tone={tx.type === 'income' ? 'forest' : 'red'}>{t(`dashboard.finance.categories.${tx.category}`)}</StatusChip>
                      </td>
                      <td className="text-sm text-[var(--ag-text)]">{tx.description}</td>
                      <td className={`text-sm font-extrabold ${tx.type === 'income' ? 'text-brand-green-dark dark:text-brand-green-light' : 'text-[var(--ag-red)]'}`}>
                        {tx.type === 'income' ? '+' : '-'}${tx.amount}
                      </td>
                      <td className="text-right">
                        <button onClick={() => deleteTransaction(tx.id)} className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ag-text-soft)] transition-colors hover:bg-red-50 hover:text-[var(--ag-red)] dark:hover:bg-red-900/20">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-[var(--ag-text-muted)]">
                    {t('dashboard.finance.noTransactions')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <div className="ui-modal-backdrop">
          <div className="ui-modal-panel">
            <div className="flex items-center justify-between border-b border-[var(--ag-border)] px-6 py-5">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ag-text-soft)]">{t('dashboard.finance.modal.title')}</p>
                <h3 className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-[var(--ag-text)]">Add transaction</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="ui-button ui-button-ghost !min-h-[2.5rem] !px-3">
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
              {formError ? (
                <div className="rounded-2xl border border-red-300/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-[var(--ag-red)]">
                  {formError}
                </div>
              ) : null}

              <div className="ui-pill-toggle w-full">
                <button type="button" className={type === 'expense' ? 'is-active' : ''} onClick={() => setType('expense')}>
                  {t('dashboard.finance.modal.expenseType')}
                </button>
                <button type="button" className={type === 'income' ? 'is-active' : ''} onClick={() => setType('income')}>
                  {t('dashboard.finance.modal.incomeType')}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="ui-field">
                  <span className="ui-label">{t('dashboard.finance.modal.amount')}</span>
                  <input type="number" required value={amount} onChange={event => setAmount(event.target.value)} className="ui-input" placeholder="0.00" />
                </label>

                <label className="ui-field">
                  <span className="ui-label">{t('dashboard.finance.modal.category')}</span>
                  <select value={category} onChange={event => setCategory(event.target.value as TransactionCategory)} className="ui-select">
                    {['Seeds', 'Fertilizers', 'Labor', 'Fuel', 'Equipment', 'Sale', 'Other'].map(item => (
                      <option key={item} value={item}>
                        {t(`dashboard.finance.categories.${item}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="ui-field">
                  <span className="ui-label">{t('dashboard.finance.modal.date')}</span>
                  <input type="date" value={date} onChange={event => setDate(event.target.value)} className="ui-input" />
                </label>

                {farms.length > 0 ? (
                  <label className="ui-field">
                    <span className="ui-label">{t('dashboard.finance.modal.farm')}</span>
                    <select value={farmId} onChange={event => setFarmId(event.target.value)} className="ui-select">
                      <option value="">General (No specific farm)</option>
                      {farms.map(farm => (
                        <option key={farm.id} value={farm.id}>
                          {farm.crop || farm.name} ({farm.season || 'No active cycle'})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              <label className="ui-field">
                <span className="ui-label">{t('dashboard.finance.modal.description')}</span>
                <input type="text" required value={description} onChange={event => setDescription(event.target.value)} className="ui-input" />
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="ui-button ui-button-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="ui-button ui-button-primary">
                  {isSaving ? (
                    <>
                      <Spinner small />
                      <span>Saving...</span>
                    </>
                  ) : (
                    t('dashboard.finance.modal.save')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
