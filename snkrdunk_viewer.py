import streamlit as st
import sqlite3
import pandas as pd
import time

# Page Config
st.set_page_config(
    page_title="SNKRDUNK PSA 10 Viewer",
    page_icon="💎",
    layout="wide"
)

# Database Connection
DB_NAME = 'snkrdunk.db'

def get_data():
    conn = sqlite3.connect(DB_NAME)
    # Check if table exists
    try:
        query = "SELECT * FROM card_prices ORDER BY scraped_at DESC"
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df
    except:
        conn.close()
        return pd.DataFrame()

# Title
st.title("💎 SNKRDUNK PSA 10 Market Data")
st.markdown("Real-time tracked PSA 10 transaction prices from SNKRDUNK.")

# Metrics
df = get_data()

if not df.empty:
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Cards Tracked", len(df))
    with col2:
        if 'psa10_latest_price' in df.columns:
            avg_price = df['psa10_latest_price'].mean()
            st.metric("Average PSA 10 Price", f"${avg_price:,.0f}")
    with col3:
        latest = df.iloc[0]
        price = latest['psa10_latest_price'] if 'psa10_latest_price' in df.columns else 0
        st.metric("Latest Scan", latest['card_name'], f"${price:,}")

    # Data Table
    st.subheader("📋 Transaction History")
    
    # Format Price
    if 'psa10_latest_price' in df.columns:
        df['psa10_latest_price'] = df['psa10_latest_price'].apply(lambda x: f"${x:,}")
    
    st.dataframe(
        df,
        column_config={
            "card_id": "ID",
            "card_name": "Name",
            "set_name": "Set",
            "psa10_latest_price": "Latest Price",
            "psa10_average_price": "Avg Price",
            "scraped_at": "Time"
        },
        use_container_width=True,
        hide_index=True
    )
    
else:
    st.info("No data found in database. Search for a card to start scraping!")

# Refresh Button
if st.button("🔄 Refresh Data"):
    st.rerun()
