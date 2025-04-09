exports.isDemo = async (req, res, next) => {
    const userEmail = req.user?.email;
  
    console.log("Demo Check for:", userEmail);
  
    const demoUsers = [
      "1234@gmail.com"
    ];
  
    if (demoUsers.includes(userEmail)) {
      return res.status(401).json({
        success: false,
        message: "This is a Demo User",
      });
    }
  
    next();
  };
  