@echo off
 
:start
echo 1:���ð�����DNS 2:�����ʼ�DNS 3:�˳�
set /p var=��ѡ��
if %var%==1 goto opt1
if %var%==2 goto opt2
if %var%==3 goto opt3
 
:opt1
cls
 
echo ������DNS 223.5.5.5  
cmd /c netsh interface ip set dns name="��̫��" source=static addr=223.5.5.5
echo ���ø�DNS 223.6.6.6
cmd /c netsh interface ip add dns name="��̫��" addr=223.6.6.6 index=2
ipconfig /flushdns
 
echo ���
goto start
 
:opt2
cls
 
echo ������DNS 10.0.9.150 
cmd /c netsh interface ip set dns name="��̫��" source=static addr=10.0.9.150
echo ���ø�DNS 10.0.1.150
cmd /c netsh interface ip add dns name="��̫��" addr=10.0.1.150 index=2
ipconfig /flushdns
 
echo ���
goto start

:opt3
cls
exit