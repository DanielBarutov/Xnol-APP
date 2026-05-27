import { AddTxModal } from '../../features/transactions/AddTxModal'
import { AllTransactionsModal } from '../../features/transactions/AllTransactionsModal'
import { TransactionDetailModal } from '../../features/transactions/TransactionDetailModal'
import { TransferModal } from '../../features/accounts/TransferModal'
import { DepositDetailModal } from '../../features/accounts/DepositDetailModal'
import { AccountDetailModal } from '../../features/accounts/AccountDetailModal'
import { AccountEditModal } from '../../features/accounts/AccountEditModal'
import { CreateAccountModal } from '../../features/accounts/CreateAccountModal'
import { CreateDepositModal } from '../../features/accounts/CreateDepositModal'
import { CategoryManageModal } from '../../features/categories/CategoryManageModal'

export function ModalRoot() {
  return (
    <>
      <AddTxModal />
      <AllTransactionsModal />
      <TransactionDetailModal />
      <TransferModal />
      <DepositDetailModal />
      <AccountDetailModal />
      <AccountEditModal />
      <CreateAccountModal />
      <CreateDepositModal />
      <CategoryManageModal />
    </>
  )
}
