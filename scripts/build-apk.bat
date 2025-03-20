@echo off
echo Building APK...

:: Install eas-cli if not installed
call npm install -g eas-cli

:: Login to Expo
call eas login

:: Build APK
call eas build -p android --profile preview

echo Build process initiated. Check the Expo website for build status.
pause
