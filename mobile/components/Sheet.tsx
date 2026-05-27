import React, { forwardRef, useCallback } from 'react'
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { useTheme } from '../theme/ThemeProvider'

interface SheetProps {
  snapPoints?: readonly (string | number)[]
  children: React.ReactNode
  onClose?: () => void
}

export const Sheet = forwardRef<BottomSheet, SheetProps>(({ snapPoints = ['60%', '90%'], children, onClose }, ref) => {
  const colors = useTheme()

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  )

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints ? [...snapPoints] : undefined}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onClose={onClose}
      keyboardBehavior="interactive"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 40 }}>
        {children}
      </BottomSheetView>
    </BottomSheet>
  )
})
