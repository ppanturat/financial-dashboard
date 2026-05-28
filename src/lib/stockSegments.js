export const STOCK_SEGMENTS = {
  AAPL:['TECH','MEGA CAP'],
  MSFT:['TECH','AI'],
  NVDA:['AI','SEMIS'],
  GOOGL:['TECH','ADS'],
  AMZN:['E-COM','CLOUD'],
  META:['SOCIAL','TECH'],
  TSLA:['EV','AUTO'],
  JPM:['BANKING','FINANCE'],
  JNJ:['HEALTH','DEFENSIVE'],
  UNH:['HEALTH','INSURANCE'],
  XOM:['ENERGY'],
  VOO:['ETF'],
  SPY:['ETF'],
}

export function getStockSegments(ticker, isEtf=false){
  if(isEtf) return ['ETF']
  return STOCK_SEGMENTS[ticker?.toUpperCase()] || ['EQUITY']
}
