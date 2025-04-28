import { Database } from '@/types/database';

type Loan = Database['public']['Tables']['loans']['Row'];

export interface LoanInterestDetail {
  loanId: string;
  loanName: string;
  loanType: string;
  interest: number;
  amount: number;
}

export interface YearlyInterestRow {
  year: number;
  totalInterest: number;
  details: LoanInterestDetail[];
}

/**
 * Calcule les intérêts payés par prêt et par année.
 * @param loans Liste des prêts
 * @param startYear Première année à afficher
 * @param endYear Dernière année à afficher
 */
export function computeYearlyInterests(loans: Loan[], startYear: number, endYear: number): YearlyInterestRow[] {
  const result: YearlyInterestRow[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const details: LoanInterestDetail[] = [];
    let totalInterest = 0;
    loans.forEach((loan) => {
      if (!loan.start_date || !loan.end_date || !loan.amount || !loan.interest_rate) return;
      const loanStart = new Date(loan.start_date);
      const loanEnd = new Date(loan.end_date);
      if (year < loanStart.getFullYear() || year > loanEnd.getFullYear()) return;
      const isInFine = loan.repayment_type === 'in fine';
      const amortProfile = loan.amortization_profile || 'classique';
      let interest = 0;
      if (isInFine) {
        // Prêt in fine : intérêts fixes chaque année tant que le prêt existe
        let months = 12;
        if (year === loanStart.getFullYear()) months -= loanStart.getMonth();
        if (year === loanEnd.getFullYear()) months = loanEnd.getMonth() + 1;
        interest = Number(loan.amount) * (Number(loan.interest_rate) / 100) * (months / 12);
      } else if (amortProfile === 'constant') {
        // Amortissement constant : même part de capital chaque mois, intérêts dégressifs, mensualité qui baisse
        let months = 0;
        let firstMonth = 0;
        let lastMonth = 11;
        if (year === loanStart.getFullYear()) firstMonth = loanStart.getMonth();
        if (year === loanEnd.getFullYear()) lastMonth = loanEnd.getMonth();
        months = lastMonth - firstMonth + 1;
        const capital = Number(loan.amount);
        const monthlyRate = Number(loan.interest_rate) / 100 / 12;
        const totalMonths = ((loanEnd.getFullYear() - loanStart.getFullYear()) * 12 + (loanEnd.getMonth() - loanStart.getMonth()) + 1);
        const monthlyPrincipal = capital / totalMonths;
        let remainingCapital = capital;
        let monthIdx = 0;
        for (let y = loanStart.getFullYear(); y <= year; y++) {
          let mStart = (y === loanStart.getFullYear()) ? loanStart.getMonth() : 0;
          let mEnd = (y === loanEnd.getFullYear()) ? loanEnd.getMonth() : 11;
          if (y === year) mEnd = lastMonth;
          for (let m = mStart; m <= mEnd; m++) {
            if (y === year && (m < firstMonth || m > lastMonth)) continue;
            if (monthIdx >= totalMonths) break;
            const interestMonth = remainingCapital * monthlyRate;
            if (y === year) interest += interestMonth;
            remainingCapital = Math.max(0, remainingCapital - monthlyPrincipal);
            monthIdx++;
          }
        }
      } else {
        // Prêt amortissable classique (annuité constante)
        let months = 0;
        let firstMonth = 0;
        let lastMonth = 11;
        if (year === loanStart.getFullYear()) firstMonth = loanStart.getMonth();
        if (year === loanEnd.getFullYear()) lastMonth = loanEnd.getMonth();
        months = lastMonth - firstMonth + 1;
        let capital = Number(loan.amount);
        const monthlyRate = Number(loan.interest_rate) / 100 / 12;
        const totalMonths = ((loanEnd.getFullYear() - loanStart.getFullYear()) * 12 + (loanEnd.getMonth() - loanStart.getMonth()) + 1);
        let monthlyPayment = Number(loan.monthly_payment) || 0;
        if (!monthlyPayment && monthlyRate > 0) {
          monthlyPayment = capital * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
        } else if (!monthlyPayment) {
          monthlyPayment = capital / totalMonths;
        }
        let monthIdx = 0;
        let paidMonths = 0;
        for (let y = loanStart.getFullYear(); y <= year; y++) {
          let mStart = (y === loanStart.getFullYear()) ? loanStart.getMonth() : 0;
          let mEnd = (y === loanEnd.getFullYear()) ? loanEnd.getMonth() : 11;
          if (y === year) mEnd = lastMonth;
          for (let m = mStart; m <= mEnd; m++) {
            if (y === year && (m < firstMonth || m > lastMonth)) continue;
            if (monthIdx >= totalMonths) break;
            const interestMonth = capital * monthlyRate;
            if (y === year) interest += interestMonth;
            const principal = monthlyPayment - interestMonth;
            capital = Math.max(0, capital - principal);
            monthIdx++;
            paidMonths++;
          }
        }
      }
      details.push({
        loanId: String(loan.id),
        loanName: loan.name || '',
        loanType: loan.repayment_type || '',
        interest,
        amount: Number(loan.amount)
      });
      totalInterest += interest;
    });
    result.push({ year, totalInterest, details });
  }
  return result;
}
