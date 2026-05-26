import { AddTxModal } from '../../features/transactions/AddTxModal'
import { TransferModal } from '../../features/accounts/TransferModal'
import { DepositDetailModal } from '../../features/accounts/DepositDetailModal'
import { AccountDetailModal } from '../../features/accounts/AccountDetailModal'
import { CreateAccountModal } from '../../features/accounts/CreateAccountModal'
import { CreateDepositModal } from '../../features/accounts/CreateDepositModal'

export function ModalRoot() {
  return (
    <>
      <AddTxModal />
      <TransferModal />
      <DepositDetailModal />
      <AccountDetailModal />
      <CreateAccountModal />
      <CreateDepositModal />
    </>
  )
}
