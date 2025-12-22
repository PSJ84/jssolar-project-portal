/**
 * 부가세 관련 유틸리티 함수
 */

// 부가세율 (10%)
export const VAT_RATE = 0.1;

/**
 * 부가세 포함 금액 계산
 * @param amount 공급가액
 * @param vatIncluded 부가세 포함 여부
 * @returns 부가세 포함 시 공급가액 * 1.1, 미포함 시 공급가액 그대로
 */
export function getDisplayAmount(amount: number, vatIncluded: boolean): number {
  return vatIncluded ? Math.round(amount * (1 + VAT_RATE)) : amount;
}

/**
 * 부가세 금액 계산
 * @param amount 공급가액
 * @param vatIncluded 부가세 포함 여부
 * @returns 부가세 금액 (미포함 시 0)
 */
export function getVatAmount(amount: number, vatIncluded: boolean): number {
  return vatIncluded ? Math.round(amount * VAT_RATE) : 0;
}

/**
 * 부가세 포함 금액에서 공급가액 역산
 * @param totalAmount 부가세 포함 총액
 * @returns 공급가액
 */
export function getSupplyAmount(totalAmount: number): number {
  return Math.round(totalAmount / (1 + VAT_RATE));
}

/**
 * 금액 포맷 (천 단위 콤마)
 * @param amount 금액
 * @returns 포맷된 문자열
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount);
}

/**
 * 금액 포맷 (부가세 포함 표시)
 * @param amount 공급가액
 * @param vatIncluded 부가세 포함 여부
 * @returns 포맷된 문자열 (부가세 포함 시 VAT 표시)
 */
export function formatAmountWithVat(amount: number, vatIncluded: boolean): string {
  const displayAmount = getDisplayAmount(amount, vatIncluded);
  const formatted = formatAmount(displayAmount);
  return vatIncluded ? `${formatted} (VAT 포함)` : formatted;
}
