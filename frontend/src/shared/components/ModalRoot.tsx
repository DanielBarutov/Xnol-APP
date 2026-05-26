import { AddTxModal } from '../../features/transactions/AddTxModal'
import { TransferModal } from '../../features/accounts/TransferModal'
import { DepositDetailModal } from '../../features/accounts/DepositDetailModal'
import { AccountDetailModal } from '../../features/accounts/AccountDetailModal'

export function ModalRoot() {
  return (
    <>
      <AddTxModal />
      <TransferModal />
      <DepositDetailModal />
      <AccountDetailModal />
    </>
  )
}
