// Add this to check auction status
const checkAuctionEnd = async () => {
    if (!contracts.auction) return;
    
    try {
      const status = await contracts.auction.getAuctionStatus();
      const newStatus = ["OPEN", "PAUSED", "CLOSED"][status] || "UNKNOWN";
      
      setState(prev => ({
        ...prev,
        auction: {
          ...prev.auction,
          status: newStatus
        }
      }));
    } catch (error) {
      console.error("Error checking auction status:", error);
    }
  };
  
  // Modify the timer effect to check for end
  useEffect(() => {
    if (state.auction.status === "OPEN" && state.auction.timeRemaining > 0) {
      const timer = setInterval(() => {
        setState(prev => {
          const newTimeRemaining = Math.max(0, prev.auction.timeRemaining - 1);
          
          // If time hits 0, check auction status
          if (newTimeRemaining === 0) {
            checkAuctionEnd();
          }
          
          return {
            ...prev,
            auction: {
              ...prev.auction,
              timeRemaining: newTimeRemaining
            }
          };
        });
      }, 1000);
  
      return () => clearInterval(timer);
    }
  }, [state.auction.status, state.auction.timeRemaining]);
  
  // Update the event listener
  const setupEventListeners = (contract) => {
    if (!contract) return;
  
    contract.on("AuctionEnded", async (totalFundsRaised, unsoldTokens) => {
      console.log("Auction ended:", {
        totalFundsRaised: ethers.formatEther(totalFundsRaised),
        unsoldTokens: ethers.formatEther(unsoldTokens)
      });
      
      // Update status and info
      setState(prev => ({
        ...prev,
        auction: {
          ...prev.auction,
          status: "CLOSED",
          timeRemaining: 0,
          totalFundsRaised: ethers.formatEther(totalFundsRaised)
        }
      }));
    });
  
    // ... other event listeners ...
  };