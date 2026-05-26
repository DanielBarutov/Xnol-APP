import { AddTxModal } from '../../features/transactions/AddTxModal'
import { AllTransactionsModal } from '../../features/transactions/AllTransactionsModal'
import { TransferModal } from '../../features/accounts/TransferModal'
import { DepositDetailModal } from '../../features/accounts/DepositDetailModal'
import { AccountDetailModal } from '../../features/accounts/AccountDetailModal'
import { CreateAccountModal } from '../../features/accounts/CreateAccountModal'
import { CreateDepositModal } from '../../features/accounts/CreateDepositModal'
import { CategoryManageModal } from '../../features/categories/CategoryManageModal'

export function ModalRoot() {
  return (
    <>
      <AddTxModal />
      <AllTransactionsModal />
      <TransferModal />
      <DepositDetailModal />
      <AccountDetailModal />
      <CreateAccountModal />
      <CreateDepositModal />
      <CategoryManageModal />
    </>
  )
}
