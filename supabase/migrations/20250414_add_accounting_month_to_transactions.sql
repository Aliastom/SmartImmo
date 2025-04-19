-- Add accounting_month column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS accounting_month DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_transactions_accounting_month 
ON public.transactions(accounting_month);

-- Update existing transactions to use their date as accounting_month
UPDATE public.transactions 
SET accounting_month = date::date 
WHERE accounting_month = CURRENT_DATE;
